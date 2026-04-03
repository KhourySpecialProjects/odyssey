import { checkRateLimit, RATE_LIMITS, type AIAction } from "../rate-limiter";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// We manipulate Date.now to control the sliding window
const realDateNow = Date.now;

function setNow(ms: number) {
  jest.spyOn(Date, "now").mockReturnValue(ms);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  // Reset the module between tests to clear the in-memory store
  jest.resetModules();
});

afterAll(() => {
  Date.now = realDateNow;
});

// Helper to import a fresh instance of the module
async function freshModule() {
  const m = await import("../rate-limiter");
  return m;
}

describe("RATE_LIMITS config", () => {
  it("has limits for all three actions", () => {
    expect(RATE_LIMITS["split"]).toBeDefined();
    expect(RATE_LIMITS["expand"]).toBeDefined();
    expect(RATE_LIMITS["custom-prompt"]).toBeDefined();
  });

  it("System Admin limit is effectively unlimited (1000)", () => {
    expect(RATE_LIMITS["split"]["system-admin"]).toBe(1000);
    expect(RATE_LIMITS["expand"]["system-admin"]).toBe(1000);
    expect(RATE_LIMITS["custom-prompt"]["system-admin"]).toBe(1000);
  });

  it("Faculty has higher limit than User", () => {
    expect(RATE_LIMITS["expand"]["faculty"]).toBeGreaterThan(
      RATE_LIMITS["expand"]["user"],
    );
  });
});

describe("checkRateLimit", () => {
  it("allows request under the limit", async () => {
    jest.resetModules();
    const { checkRateLimit: check } = await import("../rate-limiter");
    setNow(1000);
    const result = check(
      "user@test.com",
      [AuthorizedUserRoleTitle.User],
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

    const userLimit = limits["expand"]["user"]; // 10
    const email = "blocked@test.com";

    // Exhaust the limit
    for (let i = 0; i < userLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.User], "expand");
    }

    // Next call should be blocked
    const result = check(email, [AuthorizedUserRoleTitle.User], "expand");
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

    const userLimit = limits["expand"]["user"];
    const email = "sliding@test.com";

    // Exhaust limit at t=0
    for (let i = 0; i < userLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.User], "expand");
    }

    // Still blocked just before the window expires
    setNow(base + 3599_000);
    const stillBlocked = check(email, [AuthorizedUserRoleTitle.User], "expand");
    expect(stillBlocked.allowed).toBe(false);

    // After 1 hour + 1ms, old entries are pruned and request is allowed
    setNow(base + 3600_001);
    const allowed = check(email, [AuthorizedUserRoleTitle.User], "expand");
    expect(allowed.allowed).toBe(true);
  });

  it("uses highest role tier when user has multiple roles", async () => {
    jest.resetModules();
    const { checkRateLimit: check, RATE_LIMITS: limits } = await import(
      "../rate-limiter"
    );
    setNow(1000);

    const facultyLimit = limits["expand"]["faculty"]; // 50
    const userLimit = limits["expand"]["user"]; // 10
    const email = "multi@test.com";

    // User has both User and Faculty roles — Faculty should win
    // Exhaust beyond user limit but under faculty limit
    for (let i = 0; i < userLimit + 5; i++) {
      check(
        email,
        [AuthorizedUserRoleTitle.User, AuthorizedUserRoleTitle.Faculty],
        "expand",
      );
    }

    // Should still be allowed (faculty limit not yet reached)
    const result = check(
      email,
      [AuthorizedUserRoleTitle.User, AuthorizedUserRoleTitle.Faculty],
      "expand",
    );
    expect(result.allowed).toBe(true);

    // Exhaust up to faculty limit
    for (let i = userLimit + 6; i < facultyLimit; i++) {
      check(
        email,
        [AuthorizedUserRoleTitle.User, AuthorizedUserRoleTitle.Faculty],
        "expand",
      );
    }

    // Now at faculty limit — next should be blocked
    const blocked = check(
      email,
      [AuthorizedUserRoleTitle.User, AuthorizedUserRoleTitle.Faculty],
      "expand",
    );
    expect(blocked.allowed).toBe(false);
  });

  it("System Admin is effectively unlimited (1000 calls allowed)", async () => {
    jest.resetModules();
    const { checkRateLimit: check } = await import("../rate-limiter");
    setNow(1000);

    const email = "admin@test.com";
    // Make 999 calls — all should be allowed (limit is 1000)
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
    const splitLimit = limits["split"]["user"]; // 5

    // Exhaust split limit
    for (let i = 0; i < splitLimit; i++) {
      check(email, [AuthorizedUserRoleTitle.User], "split");
    }

    const splitBlocked = check(email, [AuthorizedUserRoleTitle.User], "split");
    expect(splitBlocked.allowed).toBe(false);

    // expand action should still be allowed
    const expandAllowed = check(
      email,
      [AuthorizedUserRoleTitle.User],
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

    const limit = limits["expand"]["user"];

    // Exhaust for user A
    for (let i = 0; i < limit; i++) {
      check("userA@test.com", [AuthorizedUserRoleTitle.User], "expand");
    }

    // user A is blocked
    expect(
      check("userA@test.com", [AuthorizedUserRoleTitle.User], "expand").allowed,
    ).toBe(false);
    // user B is not affected
    expect(
      check("userB@test.com", [AuthorizedUserRoleTitle.User], "expand").allowed,
    ).toBe(true);
  });
});
