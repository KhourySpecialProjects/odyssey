import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { startAiScoring, getAiScoringRun } from "@/lib/requests/ai-scoring";
import { getOrOpenReview } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { checkRateLimit } from "@/lib/import/rate-limiter";
import { startRunRoute } from "@/lib/ai-review/run-routes";
import { runAiScoring } from "@/lib/ai-review/score-run";
import { PROMPT_VERSION } from "@/lib/ai-review/prompt";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@anthropic-ai/sdk");
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/reviews", () => ({ getOrOpenReview: jest.fn() }));
jest.mock("@/lib/import/rate-limiter", () => ({
  ...jest.requireActual("@/lib/import/rate-limiter"),
  checkRateLimit: jest.fn(),
}));
jest.mock("@/lib/ai-review/run-routes", () => ({
  ...jest.requireActual("@/lib/ai-review/run-routes"),
  startRunRoute: jest.fn(),
}));
jest.mock("@/lib/ai-review/score-run", () => ({ runAiScoring: jest.fn() }));

const mockedRequireRole = jest.mocked(requireRole);
const mockedAfter = jest.mocked(after);
const mockedStart = jest.mocked(startRunRoute);

const ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];
const reviewer = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.ContentEditor] });

const CRITERIA = [
  {
    id: 1,
    name: "Tone",
    lessonDescription: "Engaging?",
    overallDescription: "Consistent?",
    order: 1,
  },
];
const RUN = {
  id: 40,
  documentId: "run40",
  runState: "queued" as const,
  startedAt: null,
  finishedAt: null,
};

let fetchMock: jest.MockedFunction<typeof fetch>;

const arrangeStart = () => {
  jest.mocked(getOrOpenReview).mockResolvedValue({
    ok: true,
    error: null,
    data: { id: 5, round: 1, key: "3:9:1", state: "open" },
  });
  jest.mocked(checkRateLimit).mockReturnValue({ allowed: true });
  mockedStart.mockResolvedValue({
    ok: true,
    data: { dropletId: 3, run: RUN, criteria: CRITERIA },
  });
};

/** v4-shaped list responses for the droplet, review and run reads, by path. */
const arrangeRunRead = (
  run: Record<string, unknown> | null,
  { authors = [{ id: 1 }], round = 1 } = {},
) => {
  const list = (rows: { id: number; [k: string]: unknown }[]) =>
    makeFetchResponse({
      data: rows.map(({ id, ...attributes }) => ({
        id,
        attributes,
      })),
    });
  fetchMock.mockImplementation(async (url) => {
    const path = String(url).split("?")[0];
    if (path.endsWith("/droplets")) {
      return list([
        {
          id: 3,
          reviewRound: round,
          authorized_users: {
            data: authors.map((a) => ({ id: a.id, attributes: {} })),
          },
        },
      ]);
    }
    if (path.endsWith("/reviews")) return list([{ id: 5, key: "3:9:1" }]);
    return list(run ? [{ id: 40, ...run }] : []);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(reviewer());
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const expectDenied = (result: any, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

describeServerActionAuth("startAiScoring", {
  requireRole: mockedRequireRole,
  invoke: () => startAiScoring(3),
  mutations: () => [mockedStart, mockedAfter, jest.mocked(revalidateTag)],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrangeStart(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describeServerActionAuth("getAiScoringRun", {
  requireRole: mockedRequireRole,
  invoke: () => getAiScoringRun(3),
  // A read: no Strapi request at all may run for a denied caller.
  mutations: () => [fetchMock],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrangeRunRead({ runState: "running" }),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describe("startAiScoring", () => {
  it("opens the review, starts one run as the session user, and scores after answering", async () => {
    arrangeStart();

    const result = await startAiScoring(3);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: {
        id: 40,
        runState: "queued",
        startedAt: null,
        finishedAt: null,
        failedLessons: [],
        error: null,
      },
    });
    expect(getOrOpenReview).toHaveBeenCalledWith(3);
    expect(mockedStart).toHaveBeenCalledWith({
      reviewId: 5,
      userId: 9,
      model: "claude-sonnet-5-5",
      promptVersion: PROMPT_VERSION,
    });
    expect(revalidateTag).toHaveBeenCalledWith("review-3");
    // The scoring itself waits until after the response.
    expect(runAiScoring).not.toHaveBeenCalled();
    expect(mockedAfter).toHaveBeenCalledTimes(1);
    await (mockedAfter.mock.calls[0][0] as () => Promise<void>)();
    expect(runAiScoring).toHaveBeenCalledWith(
      {
        runId: 40,
        userId: 9,
        dropletId: 3,
        criteria: CRITERIA,
        model: "claude-sonnet-5-5",
        effort: "high",
      },
      { client: expect.anything() },
    );
  });

  it("refuses a second run while one is going, with Strapi's message", async () => {
    arrangeStart();
    mockedStart.mockResolvedValue({
      ok: false,
      status: 409,
      message: "Score with AI is already running for this review",
    });

    const result = await startAiScoring(3);

    expect(result).toEqual({
      ok: false,
      error: "conflict",
      data: null,
      message: "Score with AI is already running for this review",
    });
    expect(mockedAfter).not.toHaveBeenCalled();
  });

  it("refuses when the rate limit is reached, before starting a run", async () => {
    arrangeStart();
    jest
      .mocked(checkRateLimit)
      .mockReturnValue({ allowed: false, retryAfterMs: 5 * 60_000 });

    const result = await startAiScoring(3);

    expect(result).toMatchObject({
      ok: false,
      error: "rate_limited",
      message: "Rate limit reached. Try again in 5 minutes.",
    });
    expect(mockedStart).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      [AuthorizedUserRoleTitle.ContentEditor],
      "ai-scoring",
    );
  });

  it("passes on a refusal from opening the review, such as an author reviewing their own droplet", async () => {
    arrangeStart();
    jest
      .mocked(getOrOpenReview)
      .mockResolvedValue({ ok: false, error: "forbidden", data: null });

    expect(await startAiScoring(3)).toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it("refuses a review that was already sent", async () => {
    arrangeStart();
    jest.mocked(getOrOpenReview).mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 5, round: 1, key: "3:9:1", state: "sent" },
    });

    expect(await startAiScoring(3)).toEqual({
      ok: false,
      error: "review_closed",
      data: null,
    });
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it("refuses without an API key, before opening a review", async () => {
    arrangeStart();
    delete process.env.ANTHROPIC_API_KEY;

    expect(await startAiScoring(3)).toMatchObject({
      ok: false,
      error: "failed",
    });
    expect(getOrOpenReview).not.toHaveBeenCalled();
  });

  it("rejects a bad droplet id", async () => {
    arrangeStart();

    expect(await startAiScoring(-1)).toEqual({
      ok: false,
      error: "invalid_input",
      data: null,
    });
    expect(getOrOpenReview).not.toHaveBeenCalled();
  });
});

describe("getAiScoringRun", () => {
  it("returns the latest run on the caller's review, never cached", async () => {
    arrangeRunRead({
      runState: "partial",
      failedLessons: [12],
      error: "Lesson 2: refusal",
      startedAt: "2026-10-29T12:00:00.000Z",
      finishedAt: "2026-10-29T12:03:00.000Z",
      updatedAt: "2026-10-29T12:03:00.000Z",
    });

    const result = await getAiScoringRun(3);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: {
        id: 40,
        runState: "partial",
        startedAt: "2026-10-29T12:00:00.000Z",
        finishedAt: "2026-10-29T12:03:00.000Z",
        failedLessons: [12],
        error: "Lesson 2: refusal",
      },
    });
    const urls = fetchMock.mock.calls.map(([url]) =>
      decodeURIComponent(String(url)),
    );
    expect(urls[1]).toContain("filters[key][$eq]=3:9:1");
    expect(urls[2]).toMatch(/\/api\/ai-scoring-runs\?/);
    expect(urls[2]).toContain("filters[review][id][$eq]=5");
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({ cache: "no-store" });
    }
  });

  it("reads a run with no progress for 10 minutes as failed", async () => {
    arrangeRunRead({
      runState: "running",
      updatedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
    });

    const result = await getAiScoringRun(3);

    expect(result.data).toMatchObject({
      runState: "failed",
      error: "Stopped: no progress for 10 minutes.",
    });
  });

  it("returns null when the caller has no run yet", async () => {
    arrangeRunRead(null);

    expect(await getAiScoringRun(3)).toEqual({
      ok: true,
      error: null,
      data: null,
    });
  });

  it("refuses an author of the droplet, whatever their role", async () => {
    arrangeRunRead({ runState: "done" }, { authors: [{ id: 9 }] });

    expect(await getAiScoringRun(3)).toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
