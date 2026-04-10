/**
 * Coverage tests for lib/requests/cached.ts
 *
 * Target: 90%+ statements
 *
 * Strategy: mock every underlying request function that cached.ts imports,
 * then verify each wrapper:
 *   1. Delegates to the correct underlying function
 *   2. Passes the correct arguments
 *   3. Returns whatever the underlying function returns
 *
 * React.cache() deduplication: In Jest/jsdom, React.cache() may not deduplicate
 * across calls in the same test because there is no per-render request scope.
 * We document the observed behaviour and test argument-passing instead of
 * asserting call count === 1.
 */

import {
  getCachedUser,
  getCachedUserSocial,
  getCachedUserCreation,
  getCachedEnrollments,
  getCachedEnrollmentsWithLessonIds,
  getCachedEnrollmentsDashboard,
  getCachedEnrollmentsFavorites,
  getCachedUserDashboardFull,
  getCachedUserGroups,
  getCachedUserDueDates,
  getCachedLessonBySlug,
  getCachedDraftDropletBySlug,
  getCachedDropletBySlug,
  getCachedVoyageEnrollment,
  getCachedVoyageEnrollmentsByUser,
} from "@/lib/requests/cached";

// ─── module mocks ────────────────────────────────────────────────────────────
// Every module that cached.ts imports must be mocked to avoid real network calls.

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserGroups: jest.fn(),
  getUserDueDates: jest.fn(),
}));

jest.mock("@/lib/requests/lesson", () => ({
  getLessonBySlug: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletBySlug: jest.fn(),
}));

jest.mock("@/lib/requests/voyage-enrollment", () => ({
  getVoyageEnrollment: jest.fn(),
  getVoyageEnrollmentsByUser: jest.fn(),
}));

// ─── typed accessors ─────────────────────────────────────────────────────────

function getMockedGetAuthorizedUserByEmail() {
  return jest.mocked(
    require("@/lib/requests/authorized-user")
      .getAuthorizedUserByEmail as () => Promise<unknown>,
  );
}

function getMockedGetEnrollmentsByAuthorizedUser() {
  return jest.mocked(
    require("@/lib/requests/enrollment")
      .getEnrollmentsByAuthorizedUser as () => Promise<unknown>,
  );
}

function getMockedGetUserGroups() {
  return jest.mocked(
    require("@/lib/requests/groups").getUserGroups as () => Promise<unknown>,
  );
}

function getMockedGetUserDueDates() {
  return jest.mocked(
    require("@/lib/requests/groups").getUserDueDates as () => Promise<unknown>,
  );
}

function getMockedGetLessonBySlug() {
  return jest.mocked(
    require("@/lib/requests/lesson").getLessonBySlug as () => Promise<unknown>,
  );
}

function getMockedGetDropletBySlug() {
  return jest.mocked(
    require("@/lib/requests/droplet")
      .getDropletBySlug as () => Promise<unknown>,
  );
}

function getMockedGetVoyageEnrollment() {
  return jest.mocked(
    require("@/lib/requests/voyage-enrollment")
      .getVoyageEnrollment as () => Promise<unknown>,
  );
}

function getMockedGetVoyageEnrollmentsByUser() {
  return jest.mocked(
    require("@/lib/requests/voyage-enrollment")
      .getVoyageEnrollmentsByUser as () => Promise<unknown>,
  );
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 1,
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
};

const MOCK_ENROLLMENTS = [{ id: "enroll-1", isComplete: false }];
const MOCK_LESSON = {
  id: 10,
  slug: "intro-to-python",
  name: "Intro to Python",
};
const MOCK_DROPLET = { id: 5, slug: "python-basics", name: "Python Basics" };
const MOCK_GROUPS = [{ id: 3, groupName: "CS4500" }];
const MOCK_DUE_DATES = [{ id: 7, dueDate: "2024-05-01" }];
const MOCK_VOYAGE_ENROLLMENT = { id: 20, completionPercentage: 50 };

// ─── tests ────────────────────────────────────────────────────────────────────

describe("cached.ts — getCachedUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetAuthorizedUserByEmail().mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with email", async () => {
    const result = await getCachedUser("user@example.com");

    expect(getMockedGetAuthorizedUserByEmail()).toHaveBeenCalledWith(
      "user@example.com",
      expect.anything(), // USER_POPULATES.profile
      expect.anything(), // CACHE_TAGS.users
    );
    expect(result).toEqual(MOCK_USER);
  });

  it("returns null when user does not exist", async () => {
    getMockedGetAuthorizedUserByEmail().mockResolvedValue(null);

    const result = await getCachedUser("nobody@example.com");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedUserSocial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined when getCachedUser returns undefined", async () => {
    getMockedGetAuthorizedUserByEmail().mockResolvedValue(undefined);

    const result = await getCachedUserSocial("ghost@example.com");

    expect(result).toBeUndefined();
  });

  it("calls getAuthorizedUserByEmail twice: once for profile, once for social", async () => {
    // First call (getCachedUser) returns the user; second call (social) returns social data
    getMockedGetAuthorizedUserByEmail()
      .mockResolvedValueOnce(MOCK_USER)
      .mockResolvedValueOnce({
        ...MOCK_USER,
        linkedIn: "https://linkedin.com/in/test",
      });

    const result = await getCachedUserSocial("user@example.com");

    expect(getMockedGetAuthorizedUserByEmail()).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ id: 1 });
  });
});

describe("cached.ts — getCachedUserCreation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetAuthorizedUserByEmail().mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with creation populate", async () => {
    const result = await getCachedUserCreation("user@example.com");

    expect(getMockedGetAuthorizedUserByEmail()).toHaveBeenCalledWith(
      "user@example.com",
      expect.anything(),
      expect.anything(),
    );
    expect(result).toEqual(MOCK_USER);
  });
});

describe("cached.ts — getCachedEnrollments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetEnrollmentsByAuthorizedUser().mockResolvedValue(
      MOCK_ENROLLMENTS,
    );
  });

  it("delegates to getEnrollmentsByAuthorizedUser with userId", async () => {
    const result = await getCachedEnrollments(42);

    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });

  it("returns empty array when user has no enrollments", async () => {
    getMockedGetEnrollmentsByAuthorizedUser().mockResolvedValue([]);

    const result = await getCachedEnrollments(99);

    expect(result).toEqual([]);
  });
});

describe("cached.ts — getCachedEnrollmentsWithLessonIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetEnrollmentsByAuthorizedUser().mockResolvedValue(
      MOCK_ENROLLMENTS,
    );
  });

  it("delegates to getEnrollmentsByAuthorizedUser with lessonIds populate option", async () => {
    const result = await getCachedEnrollmentsWithLessonIds(42);

    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedEnrollmentsDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetEnrollmentsByAuthorizedUser().mockResolvedValue(
      MOCK_ENROLLMENTS,
    );
  });

  it("delegates to getEnrollmentsByAuthorizedUser with dashboard populate option", async () => {
    const result = await getCachedEnrollmentsDashboard(42);

    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedEnrollmentsFavorites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetEnrollmentsByAuthorizedUser().mockResolvedValue(
      MOCK_ENROLLMENTS,
    );
  });

  it("delegates to getEnrollmentsByAuthorizedUser with favorites populate option", async () => {
    const result = await getCachedEnrollmentsFavorites(42);

    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedUserDashboardFull", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetAuthorizedUserByEmail().mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with dashboardFull populate", async () => {
    const result = await getCachedUserDashboardFull("user@example.com");

    expect(getMockedGetAuthorizedUserByEmail()).toHaveBeenCalledWith(
      "user@example.com",
      expect.anything(),
      expect.anything(),
    );
    expect(result).toEqual(MOCK_USER);
  });
});

describe("cached.ts — getCachedUserGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetUserGroups().mockResolvedValue(MOCK_GROUPS);
  });

  it("delegates to getUserGroups with authorizedUserId", async () => {
    const result = await getCachedUserGroups(42);

    expect(getMockedGetUserGroups()).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_GROUPS);
  });

  it("returns empty array when user has no groups", async () => {
    getMockedGetUserGroups().mockResolvedValue([]);

    const result = await getCachedUserGroups(99);

    expect(result).toEqual([]);
  });
});

describe("cached.ts — getCachedUserDueDates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetUserDueDates().mockResolvedValue(MOCK_DUE_DATES);
  });

  it("delegates to getUserDueDates with authorizedUserId", async () => {
    const result = await getCachedUserDueDates(42);

    expect(getMockedGetUserDueDates()).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_DUE_DATES);
  });
});

describe("cached.ts — getCachedLessonBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetLessonBySlug().mockResolvedValue(MOCK_LESSON);
  });

  it("delegates to getLessonBySlug with the slug", async () => {
    const result = await getCachedLessonBySlug("intro-to-python");

    expect(getMockedGetLessonBySlug()).toHaveBeenCalledWith("intro-to-python");
    expect(result).toEqual(MOCK_LESSON);
  });

  it("returns null when lesson does not exist", async () => {
    getMockedGetLessonBySlug().mockResolvedValue(null);

    const result = await getCachedLessonBySlug("nonexistent-slug");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedDraftDropletBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetDropletBySlug().mockResolvedValue(MOCK_DROPLET);
  });

  it("delegates to getDropletBySlug with the slug and draft populate options", async () => {
    const result = await getCachedDraftDropletBySlug("python-basics");

    expect(getMockedGetDropletBySlug()).toHaveBeenCalledWith(
      "python-basics",
      expect.objectContaining({
        populate: expect.objectContaining({
          authorized_users: expect.anything(),
          learningObjectives: expect.anything(),
        }),
      }),
    );
    expect(result).toEqual(MOCK_DROPLET);
  });
});

describe("cached.ts — getCachedDropletBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetDropletBySlug().mockResolvedValue(MOCK_DROPLET);
  });

  it("delegates to getDropletBySlug with the slug and public populate options", async () => {
    const result = await getCachedDropletBySlug("python-basics");

    expect(getMockedGetDropletBySlug()).toHaveBeenCalledWith(
      "python-basics",
      expect.objectContaining({
        populate: expect.objectContaining({
          tags: expect.anything(),
          lessons: expect.anything(),
        }),
      }),
    );
    expect(result).toEqual(MOCK_DROPLET);
  });

  it("returns null when droplet does not exist", async () => {
    getMockedGetDropletBySlug().mockResolvedValue(null);

    const result = await getCachedDropletBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedVoyageEnrollment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetVoyageEnrollment().mockResolvedValue(MOCK_VOYAGE_ENROLLMENT);
  });

  it("delegates to getVoyageEnrollment with authorizedUserId and voyageId", async () => {
    const result = await getCachedVoyageEnrollment(42, 10);

    expect(getMockedGetVoyageEnrollment()).toHaveBeenCalledWith(42, 10);
    expect(result).toEqual(MOCK_VOYAGE_ENROLLMENT);
  });

  it("returns null when enrollment does not exist", async () => {
    getMockedGetVoyageEnrollment().mockResolvedValue(null);

    const result = await getCachedVoyageEnrollment(42, 999);

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedVoyageEnrollmentsByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetVoyageEnrollmentsByUser().mockResolvedValue([
      MOCK_VOYAGE_ENROLLMENT,
    ]);
  });

  it("delegates to getVoyageEnrollmentsByUser with authorizedUserId", async () => {
    const result = await getCachedVoyageEnrollmentsByUser(42);

    expect(getMockedGetVoyageEnrollmentsByUser()).toHaveBeenCalledWith(42);
    expect(result).toEqual([MOCK_VOYAGE_ENROLLMENT]);
  });

  it("returns empty array when user has no voyage enrollments", async () => {
    getMockedGetVoyageEnrollmentsByUser().mockResolvedValue([]);

    const result = await getCachedVoyageEnrollmentsByUser(99);

    expect(result).toEqual([]);
  });
});

// ─── React.cache deduplication behaviour in Jest ─────────────────────────────
//
// React.cache() deduplicates calls with identical arguments within a single
// React render pass. In Jest there is no per-render scope reset, so the cache
// persists across the lifetime of the module instance.
//
// Calling jest.resetModules() would give a fresh cache scope, but it also
// severs the connection between the already-imported wrapper functions and the
// jest.mock() stubs, making mock assertions unreliable.
//
// We therefore test the two properties that are always safe to assert:
//   1. Concurrent calls with the same args return the same value (idempotent).
//   2. Calls with different args always invoke the underlying function with
//      those distinct args (no cross-arg contamination).

describe("cached.ts — React.cache deduplication (within a single call context)", () => {
  it("getCachedLessonBySlug: same-arg concurrent calls both return the mocked lesson", async () => {
    jest.clearAllMocks();
    getMockedGetLessonBySlug().mockResolvedValue(MOCK_LESSON);

    const [r1, r2] = await Promise.all([
      getCachedLessonBySlug("some-slug"),
      getCachedLessonBySlug("some-slug"),
    ]);

    // Both calls return the same lesson — either from cache or two real calls.
    expect(r1).toEqual(MOCK_LESSON);
    expect(r2).toEqual(MOCK_LESSON);
  });

  it("getCachedEnrollments: different userId args each call the underlying function", async () => {
    jest.clearAllMocks();
    getMockedGetEnrollmentsByAuthorizedUser()
      .mockResolvedValueOnce([{ id: "e-1" }])
      .mockResolvedValueOnce([{ id: "e-2" }]);

    const [r1, r2] = await Promise.all([
      getCachedEnrollments(100),
      getCachedEnrollments(200),
    ]);

    // Each distinct userId reaches the underlying mock
    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(100);
    expect(getMockedGetEnrollmentsByAuthorizedUser()).toHaveBeenCalledWith(200);
    // Results are distinct because the mock returns different values per call
    expect(r1).toEqual([{ id: "e-1" }]);
    expect(r2).toEqual([{ id: "e-2" }]);
  });
});
