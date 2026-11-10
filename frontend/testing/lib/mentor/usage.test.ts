/** @jest-environment node */
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { AI_REVIEW_MODELS } from "@/lib/ai-review/models";

const user = {
  id: 7,
  email: "student@northeastern.edu",
  roles: [AuthorizedUserRoleTitle.User],
};

const fetchMock = jest.fn();

function reply(status: number, json: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  });
}

const allow = () => reply(200, { data: { allowed: true } });

/** The limiter keeps its counts in module state, so load a fresh copy. */
async function load() {
  jest.resetModules();
  return import("@/lib/mentor/usage");
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("checkMentorAllowance", () => {
  it("allows when the backend and the burst guard allow", async () => {
    const { checkMentorAllowance } = await load();
    allow();

    expect(await checkMentorAllowance(user)).toEqual({ allowed: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/mentor-usages/check");
    expect(JSON.parse(init.body)).toEqual({ userId: 7 });
    expect(init.cache).toBe("no-store");
  });

  it.each([
    ["disabled", 503, "Mentor isn't available right now.", null],
    ["not_in_pilot", 503, "Mentor isn't available for your account yet.", null],
    [
      "monthly_cap",
      503,
      "Mentor is resting until the 1st.",
      "2026-12-01T05:00:00.000Z",
    ],
    [
      "daily_limit",
      429,
      "You've asked Mentor 30 questions today. You can ask again after midnight Eastern time.",
      "2026-11-06T05:00:00.000Z",
    ],
  ])("maps %s to %i", async (reason, status, message, retryAt) => {
    const { checkMentorAllowance } = await load();
    reply(200, { data: { allowed: false, reason, message, retryAt } });

    expect(await checkMentorAllowance(user)).toEqual({
      allowed: false,
      reason,
      status,
      message,
      retryAt,
    });
  });

  it("fails closed when the request rejects", async () => {
    const { checkMentorAllowance } = await load();
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    expect(await checkMentorAllowance(user)).toEqual({
      allowed: false,
      reason: "unavailable",
      status: 503,
      message: "Mentor couldn't start. Try again in a few minutes.",
      retryAt: null,
    });
  });

  it("fails closed on a 500", async () => {
    const { checkMentorAllowance } = await load();
    reply(500, { error: { message: "boom" } });

    const result = await checkMentorAllowance(user);
    expect(result).toMatchObject({
      allowed: false,
      reason: "unavailable",
      status: 503,
    });
  });

  it("fails closed on a 200 with no data", async () => {
    const { checkMentorAllowance } = await load();
    reply(200, {});

    expect(await checkMentorAllowance(user)).toMatchObject({
      allowed: false,
      reason: "unavailable",
    });
  });

  it("fails closed on an unknown reason", async () => {
    const { checkMentorAllowance } = await load();
    reply(200, {
      data: { allowed: false, reason: "mystery", message: "?", retryAt: null },
    });

    expect(await checkMentorAllowance(user)).toMatchObject({
      reason: "unavailable",
    });
  });

  it("answers rate_limited once the burst limit is used", async () => {
    const { checkMentorAllowance } = await load();
    const { RATE_LIMITS } = await import("@/lib/import/rate-limiter");
    const limit = RATE_LIMITS.mentor.student;

    for (let i = 0; i < limit; i++) {
      allow();
      expect(await checkMentorAllowance(user)).toEqual({ allowed: true });
    }
    allow();
    const result = await checkMentorAllowance(user);

    expect(result).toMatchObject({
      allowed: false,
      reason: "rate_limited",
      status: 429,
    });
    if (result.allowed) throw new Error("expected a refusal");
    expect(result.message).toMatch(/^Rate limit reached\. Try again in \d+/);
    expect(new Date(result.retryAt as string).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("does not use a burst slot when the backend refuses", async () => {
    const { checkMentorAllowance } = await load();
    const { RATE_LIMITS } = await import("@/lib/import/rate-limiter");
    const limit = RATE_LIMITS.mentor.student;

    for (let i = 0; i < limit; i++) {
      reply(200, {
        data: {
          allowed: false,
          reason: "daily_limit",
          message: "m",
          retryAt: null,
        },
      });
      await checkMentorAllowance(user);
    }
    for (let i = 0; i < limit; i++) {
      allow();
      expect(await checkMentorAllowance(user)).toEqual({ allowed: true });
    }
  });
});

describe("recordMentorUsage", () => {
  const input = {
    user: { id: 7 },
    kind: "lesson" as const,
    model: "claude-haiku-5-5" as const,
    usage: {
      input_tokens: 100,
      output_tokens: 40,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 5,
    },
  };

  it("posts the summed input tokens and returns true", async () => {
    const { recordMentorUsage } = await load();
    reply(200, { data: { id: 1 } });

    expect(await recordMentorUsage(input)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/mentor-usages/record");
    expect(JSON.parse(init.body)).toEqual({
      userId: 7,
      kind: "lesson",
      model: "claude-haiku-5-5",
      inputTokens: 125,
      outputTokens: 40,
    });
  });

  it("treats missing or null cache counts as 0", async () => {
    const { recordMentorUsage } = await load();
    reply(200, { data: { id: 1 } });
    reply(200, { data: { id: 2 } });

    await recordMentorUsage({
      ...input,
      usage: { input_tokens: 10, output_tokens: 3 },
    });
    await recordMentorUsage({
      ...input,
      usage: {
        input_tokens: 10,
        output_tokens: 3,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    });

    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(init.body).inputTokens).toBe(10);
    }
  });

  it("retries a 503 twice, then returns false", async () => {
    const { recordMentorUsage } = await load();
    reply(503, {});
    reply(503, {});
    reply(503, {});

    expect(await recordMentorUsage(input)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a network error and can then succeed", async () => {
    const { recordMentorUsage } = await load();
    fetchMock.mockRejectedValueOnce(new Error("reset"));
    reply(200, { data: { id: 3 } });

    expect(await recordMentorUsage(input)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    const { recordMentorUsage } = await load();
    reply(400, { error: { message: "bad" } });

    expect(await recordMentorUsage(input)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("MENTOR_MODELS", () => {
  it("only lists models with a price", async () => {
    const { MENTOR_MODELS } = await load();
    for (const model of MENTOR_MODELS) {
      expect(AI_REVIEW_MODELS).toContain(model);
    }
  });
});
