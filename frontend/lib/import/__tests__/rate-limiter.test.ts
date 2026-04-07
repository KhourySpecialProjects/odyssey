import { checkRateLimit, RATE_LIMITS, type AIAction } from "../rate-limiter";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

const realDateNow = Date.now;

function setNow(ms: number) {
  jest.spyOn(Date, "now").mockReturnValue(ms);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.resetModules();
});

afterAll(() => {
  Date.now = realDateNow;
});

describe("RATE_LIMITS config", () => {
  it("has limits for all four actions", () => {
    expect(RATE_LIMITS["split"]).toBeDefined();
    expect(RATE_LIMITS["expand"]).toBeDefined();
    expect(RATE_LIMITS["custom-prompt"]).toBeDefined();
    expect(RATE_LIMITS["auto-format"]).toBeDefined();
  });

  it("System Admin limit is effectively unlimited (1000)", () => {
    expect(RATE_LIMITS["split"]["system-admin"]).toBe(1000);
    expect(RATE_LIMITS["expand"]["system-admin"]).toBe(1000);
    expect(RATE_LIMITS["custom-prompt"]["system-admin"]).toBe(1000);
    expect(RATE_LIMITS["auto-format"]["system-admin"]).toBe(1000);
  });

  it("Faculty has higher limit than Creator/Editor", () => {
    expect(RATE_LIMITS["expand"]["faculty"]).toBeGreaterThan(
      RATE_LIMITS["expand"]["creator-editor"],
    );
  });
});

describe("checkRateLimit", () => {
  it("allows request under the limit", async () => {
    jest.resetModules();
    const { checkRateLimit: check } = await import("../rate-limiter");
    setNow(1000);
    const result = check(
      "creator@test.com",
      [AuthorizedUserRoleTitle.ContentCreator],
      "expand",
    );
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("blocks request over the limit and returns retryAfterMs", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );
    setNow(1000);

    const creatorLimit = limits["expand"]["creator-editor"]; // 30
    const email = "blocked@test.com";

    for (let i = 0; i < creatorLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.ContentCreator], "expand");
    }

    const result = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator],
      "expand",
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows request again after window slides", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );

    const base = 0;
    setNow(base);

    const creatorLimit = limits["expand"]["creator-editor"];
    const email = "sliding@test.com";

    for (let i = 0; i < creatorLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.ContentCreator], "expand");
    }

    setNow(base + 3599_000);
    const stillBlocked = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator],
      "expand",
    );
    expect(stillBlocked.allowed).toBe(false);

    // After 1 hour + 1ms, old entries pruned
    setNow(base + 3600_001);
    const allowed = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator],
      "expand",
    );
    expect(allowed.allowed).toBe(true);
  });

  it("uses highest role tier when user has multiple roles", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );
    setNow(1000);

    const facultyLimit = limits["expand"]["faculty"]; // 50
    const creatorLimit = limits["expand"]["creator-editor"]; // 30
    const email = "multi@test.com";

    // Has both Creator and Faculty — Faculty should win
    for (let i = 0; i < creatorLimit + 5; i++) {
      check(
        email,
        [
          AuthorizedUserRoleTitle.ContentCreator,
          AuthorizedUserRoleTitle.Faculty,
        ],
        "expand",
      );
    }

    // Should still be allowed (faculty limit not yet reached)
    const result = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator, AuthorizedUserRoleTitle.Faculty],
      "expand",
    );
    expect(result.allowed).toBe(true);

    // Exhaust up to faculty limit
    for (let i = creatorLimit + 6; i < facultyLimit; i++) {
      check(
        email,
        [
          AuthorizedUserRoleTitle.ContentCreator,
          AuthorizedUserRoleTitle.Faculty,
        ],
        "expand",
      );
    }

    const blocked = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator, AuthorizedUserRoleTitle.Faculty],
      "expand",
    );
    expect(blocked.allowed).toBe(false);
  });

  it("System Admin is effectively unlimited (1000 calls allowed)", async () => {
    jest.resetModules();
    const { checkRateLimit: check } = await import("../rate-limiter");
    setNow(1000);

    const email = "admin@test.com";
    for (let i = 0; i < 999; i++) {
      const r = check(email, [AuthorizedUserRoleTitle.SysAdmin], "split");
      expect(r.allowed).toBe(true);
    }
  });

  it("tracks actions separately per action type", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );
    setNow(1000);

    const email = "separate@test.com";
    const splitLimit = limits["split"]["creator-editor"]; // 15

    for (let i = 0; i < splitLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.ContentCreator], "split");
    }

    const splitBlocked = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator],
      "split",
    );
    expect(splitBlocked.allowed).toBe(false);

    // expand action should still be allowed
    const expandAllowed = check(
      email,
      [AuthorizedUserRoleTitle.ContentCreator],
      "expand",
    );
    expect(expandAllowed.allowed).toBe(true);
  });

  it("tracks emails separately", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );
    setNow(1000);

    const limit = limits["expand"]["creator-editor"];

    for (let i = 0; i < limit; i++) {
      check(
        "creatorA@test.com",
        [AuthorizedUserRoleTitle.ContentCreator],
        "expand",
      );
    }

    expect(
      check(
        "creatorA@test.com",
        [AuthorizedUserRoleTitle.ContentCreator],
        "expand",
      ).allowed,
    ).toBe(false);
    expect(
      check(
        "creatorB@test.com",
        [AuthorizedUserRoleTitle.ContentCreator],
        "expand",
      ).allowed,
    ).toBe(true);
  });
});
