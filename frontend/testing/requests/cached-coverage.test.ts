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
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserGroups, getUserDueDates } from "@/lib/requests/groups";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getDropletBySlug } from "@/lib/requests/droplet";
import {
  getVoyageEnrollment,
  getVoyageEnrollmentsByUser,
} from "@/lib/requests/voyage-enrollment";

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

// ─── typed mocked references ────────────────────────────────────────────────

const mockedGetAuthorizedUserByEmail = jest.mocked(getAuthorizedUserByEmail);
const mockedGetEnrollmentsByAuthorizedUser = jest.mocked(
  getEnrollmentsByAuthorizedUser,
);
const mockedGetUserGroups = jest.mocked(getUserGroups);
const mockedGetUserDueDates = jest.mocked(getUserDueDates);
const mockedGetLessonBySlug = jest.mocked(getLessonBySlug);
const mockedGetDropletBySlug = jest.mocked(getDropletBySlug);
const mockedGetVoyageEnrollment = jest.mocked(getVoyageEnrollment);
const mockedGetVoyageEnrollmentsByUser = jest.mocked(
  getVoyageEnrollmentsByUser,
);

// ─── fixtures ─────────────────────────────────────────────────────────────────
// Tests only assert on the fields below; the full types are much wider.

import type {
  AuthorizedUser,
  Enrollment,
  Group,
  DueDate,
  Lesson,
  Droplet,
  VoyageEnrollment,
} from "@/types";

const MOCK_USER = {
  id: 1,
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
} as unknown as AuthorizedUser;

const MOCK_ENROLLMENTS = [
  { id: "enroll-1", isComplete: false },
] as unknown as Enrollment[];
const MOCK_LESSON = {
  id: 10,
  slug: "intro-to-python",
  name: "Intro to Python",
} as unknown as Lesson;
const MOCK_DROPLET = {
  id: 5,
  slug: "python-basics",
  name: "Python Basics",
} as unknown as Droplet;
const MOCK_GROUPS = [{ id: 3, groupName: "CS4500" }] as unknown as Group[];
const MOCK_DUE_DATES = [
  { id: 7, dueDate: "2024-05-01" },
] as unknown as DueDate[];
const MOCK_VOYAGE_ENROLLMENT = {
  id: 20,
  completionPercentage: 50,
} as unknown as VoyageEnrollment;

// ─── tests ────────────────────────────────────────────────────────────────────

describe("cached.ts — getCachedUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthorizedUserByEmail.mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with email", async () => {
    const result = await getCachedUser("user@example.com");

    expect(mockedGetAuthorizedUserByEmail).toHaveBeenCalledWith(
      "user@example.com",
      expect.anything(), // USER_POPULATES.profile
      expect.anything(), // CACHE_TAGS.users
    );
    expect(result).toEqual(MOCK_USER);
  });

  it("returns null when user does not exist", async () => {
    mockedGetAuthorizedUserByEmail.mockResolvedValue(
      null as unknown as AuthorizedUser,
    );

    const result = await getCachedUser("nobody@example.com");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedUserSocial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined when getCachedUser returns undefined", async () => {
    mockedGetAuthorizedUserByEmail.mockResolvedValue(
      undefined as unknown as AuthorizedUser,
    );

    const result = await getCachedUserSocial("ghost@example.com");

    expect(result).toBeUndefined();
  });

  it("calls getAuthorizedUserByEmail twice: once for profile, once for social", async () => {
    // First call (getCachedUser) returns the user; second call (social) returns social data
    mockedGetAuthorizedUserByEmail
      .mockResolvedValueOnce(MOCK_USER)
      .mockResolvedValueOnce({
        ...MOCK_USER,
        linkedin: "https://linkedin.com/in/test",
      } as unknown as AuthorizedUser);

    const result = await getCachedUserSocial("user@example.com");

    expect(mockedGetAuthorizedUserByEmail).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ id: 1 });
  });
});

describe("cached.ts — getCachedUserCreation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthorizedUserByEmail.mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with creation populate", async () => {
    const result = await getCachedUserCreation("user@example.com");

    expect(mockedGetAuthorizedUserByEmail).toHaveBeenCalledWith(
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
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue(MOCK_ENROLLMENTS);
  });

  it("delegates to getEnrollmentsByAuthorizedUser with userId", async () => {
    const result = await getCachedEnrollments(42);

    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });

  it("returns empty array when user has no enrollments", async () => {
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue([]);

    const result = await getCachedEnrollments(99);

    expect(result).toEqual([]);
  });
});

describe("cached.ts — getCachedEnrollmentsWithLessonIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue(MOCK_ENROLLMENTS);
  });

  it("delegates to getEnrollmentsByAuthorizedUser with lessonIds populate option", async () => {
    const result = await getCachedEnrollmentsWithLessonIds(42);

    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedEnrollmentsDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue(MOCK_ENROLLMENTS);
  });

  it("delegates to getEnrollmentsByAuthorizedUser with dashboard populate option", async () => {
    const result = await getCachedEnrollmentsDashboard(42);

    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedEnrollmentsFavorites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue(MOCK_ENROLLMENTS);
  });

  it("delegates to getEnrollmentsByAuthorizedUser with favorites populate option", async () => {
    const result = await getCachedEnrollmentsFavorites(42);

    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ populate: expect.anything() }),
    );
    expect(result).toEqual(MOCK_ENROLLMENTS);
  });
});

describe("cached.ts — getCachedUserDashboardFull", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthorizedUserByEmail.mockResolvedValue(MOCK_USER);
  });

  it("delegates to getAuthorizedUserByEmail with dashboardFull populate", async () => {
    const result = await getCachedUserDashboardFull("user@example.com");

    expect(mockedGetAuthorizedUserByEmail).toHaveBeenCalledWith(
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
    mockedGetUserGroups.mockResolvedValue(MOCK_GROUPS);
  });

  it("delegates to getUserGroups with authorizedUserId", async () => {
    const result = await getCachedUserGroups(42);

    expect(mockedGetUserGroups).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_GROUPS);
  });

  it("returns empty array when user has no groups", async () => {
    mockedGetUserGroups.mockResolvedValue([]);

    const result = await getCachedUserGroups(99);

    expect(result).toEqual([]);
  });
});

describe("cached.ts — getCachedUserDueDates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserDueDates.mockResolvedValue(MOCK_DUE_DATES);
  });

  it("delegates to getUserDueDates with authorizedUserId", async () => {
    const result = await getCachedUserDueDates(42);

    expect(mockedGetUserDueDates).toHaveBeenCalledWith(42);
    expect(result).toEqual(MOCK_DUE_DATES);
  });
});

describe("cached.ts — getCachedLessonBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetLessonBySlug.mockResolvedValue(MOCK_LESSON);
  });

  it("delegates to getLessonBySlug with the slug", async () => {
    const result = await getCachedLessonBySlug("intro-to-python");

    expect(mockedGetLessonBySlug).toHaveBeenCalledWith("intro-to-python");
    expect(result).toEqual(MOCK_LESSON);
  });

  it("returns null when lesson does not exist", async () => {
    mockedGetLessonBySlug.mockResolvedValue(null as unknown as Lesson);

    const result = await getCachedLessonBySlug("nonexistent-slug");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedDraftDropletBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDropletBySlug.mockResolvedValue(MOCK_DROPLET);
  });

  it("delegates to getDropletBySlug with the slug and draft populate options", async () => {
    const result = await getCachedDraftDropletBySlug("python-basics");

    expect(mockedGetDropletBySlug).toHaveBeenCalledWith(
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
    mockedGetDropletBySlug.mockResolvedValue(MOCK_DROPLET);
  });

  it("delegates to getDropletBySlug with the slug and public populate options", async () => {
    const result = await getCachedDropletBySlug("python-basics");

    expect(mockedGetDropletBySlug).toHaveBeenCalledWith(
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
    mockedGetDropletBySlug.mockResolvedValue(null as unknown as Droplet);

    const result = await getCachedDropletBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedVoyageEnrollment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVoyageEnrollment.mockResolvedValue(MOCK_VOYAGE_ENROLLMENT);
  });

  it("delegates to getVoyageEnrollment with authorizedUserId and voyageId", async () => {
    const result = await getCachedVoyageEnrollment(42, 10);

    expect(mockedGetVoyageEnrollment).toHaveBeenCalledWith(42, 10);
    expect(result).toEqual(MOCK_VOYAGE_ENROLLMENT);
  });

  it("returns null when enrollment does not exist", async () => {
    mockedGetVoyageEnrollment.mockResolvedValue(null);

    const result = await getCachedVoyageEnrollment(42, 999);

    expect(result).toBeNull();
  });
});

describe("cached.ts — getCachedVoyageEnrollmentsByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVoyageEnrollmentsByUser.mockResolvedValue([
      MOCK_VOYAGE_ENROLLMENT,
    ]);
  });

  it("delegates to getVoyageEnrollmentsByUser with authorizedUserId", async () => {
    const result = await getCachedVoyageEnrollmentsByUser(42);

    expect(mockedGetVoyageEnrollmentsByUser).toHaveBeenCalledWith(42);
    expect(result).toEqual([MOCK_VOYAGE_ENROLLMENT]);
  });

  it("returns empty array when user has no voyage enrollments", async () => {
    mockedGetVoyageEnrollmentsByUser.mockResolvedValue([]);

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
    mockedGetLessonBySlug.mockResolvedValue(MOCK_LESSON);

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
    mockedGetEnrollmentsByAuthorizedUser
      .mockResolvedValueOnce([{ id: "e-1" }] as unknown as Enrollment[])
      .mockResolvedValueOnce([{ id: "e-2" }] as unknown as Enrollment[]);

    const [r1, r2] = await Promise.all([
      getCachedEnrollments(100),
      getCachedEnrollments(200),
    ]);

    // Each distinct userId reaches the underlying mock
    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(100);
    expect(mockedGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(200);
    // Results are distinct because the mock returns different values per call
    expect(r1).toEqual([{ id: "e-1" }]);
    expect(r2).toEqual([{ id: "e-2" }]);
  });
});
