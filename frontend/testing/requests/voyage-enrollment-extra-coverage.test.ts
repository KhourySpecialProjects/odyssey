/**
 * Coverage gap tests for lib/requests/voyage-enrollment.ts
 *
 * Targets uncovered lines:
 *   106      enrollInVoyage — authorizedUser not found (getCachedUser returns null)
 *   181-182  enrollInVoyage — outer catch
 *   203      unenrollFromVoyage — authorizedUser not found
 *   271-272  unenrollFromVoyage — outer catch (try block throws)
 *   327,332  markVoyageNodeComplete — authorizedUserId mismatch
 *   355      markVoyageNodeComplete — enrollmentCheck empty
 *   381      markVoyageNodeComplete — idempotent path (existing completion)
 *   497-503  markVoyageNodeComplete — PUT progress update fails
 *   521-522  markVoyageNodeComplete — outer catch
 *   677      checkPlaylistVoyageNode — outer catch (swallowed error)
 */

import {
  enrollInVoyage,
  unenrollFromVoyage,
  markVoyageNodeComplete,
  checkAndCompleteVoyageNode,
} from "@/lib/requests/voyage-enrollment";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { requireRole } from "@/lib/auth/require-role";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

// voyage-progress is dynamically imported inside markVoyageNodeComplete
jest.mock("@/lib/voyage-progress", () => ({
  computeCompletionPercentage: jest.fn(() => 50),
}));

// ---------------------------------------------------------------------------
// Typed test fixtures
//
// The functions under test only read `.email` and `.id` from these objects.
// We use `unknown` shim casts so mockResolvedValue() accepts them without
// `as any` or `as jest.Mock`.
// ---------------------------------------------------------------------------

// next-auth User as a minimal test double
const SESSION_USER = {
  email: "student@example.com",
} as unknown as Awaited<ReturnType<typeof getCurrentUser>>;

// AuthorizedUser as a minimal test double
const AUTH_USER = {
  id: 42,
  email: "student@example.com",
} as unknown as Awaited<ReturnType<typeof getCachedUser>>;

// Simulates getCachedUser returning null (user not in DB)
const AUTH_USER_NULL = null as unknown as Awaited<
  ReturnType<typeof getCachedUser>
>;

function getMockedFetchAPI() {
  return jest.mocked(fetchAPI);
}

// ---------------------------------------------------------------------------
// enrollInVoyage — authorizedUser not found (line 106)
// ---------------------------------------------------------------------------

describe("enrollInVoyage — authorizedUser not found", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when getCachedUser returns null", async () => {
    jest.mocked(requireRole).mockResolvedValue({
      ok: true,
      user: { id: 42, email: "student@example.com", roles: [] },
    });
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER_NULL);

    const result = await enrollInVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "Authorized user not found",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// enrollInVoyage — outer catch (lines 181-182)
// ---------------------------------------------------------------------------

describe("enrollInVoyage — outer catch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns generic error when an unexpected exception is thrown", async () => {
    jest.mocked(requireRole).mockResolvedValue({
      ok: true,
      user: { id: 42, email: "student@example.com", roles: [] },
    });
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);
    // fetchAPI (voyage status check) throws unexpectedly
    getMockedFetchAPI().mockRejectedValueOnce(new Error("Unexpected failure"));

    const result = await enrollInVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to enroll in voyage.",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// unenrollFromVoyage — authorizedUser not found (line 203)
// ---------------------------------------------------------------------------

describe("unenrollFromVoyage — authorizedUser not found", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
  });

  it("returns error when getCachedUser returns null", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER_NULL);

    const result = await unenrollFromVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "Authorized user not found",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// unenrollFromVoyage — outer catch (lines 271-272)
// ---------------------------------------------------------------------------

describe("unenrollFromVoyage — outer catch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns generic error when fetchAPI throws unexpectedly", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);
    // getVoyageEnrollment's fetchAPI call throws
    getMockedFetchAPI().mockRejectedValueOnce(new Error("DB connection lost"));

    const result = await unenrollFromVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to unenroll from voyage.",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// markVoyageNodeComplete — authorizedUserId mismatch (lines 331-332)
// ---------------------------------------------------------------------------

describe("markVoyageNodeComplete — userId mismatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
  });

  it("returns Unauthorized when passed authorizedUserId does not match session user", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    // Session user id is 42
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    // Pass a different authorizedUserId (99 ≠ 42)
    const result = await markVoyageNodeComplete(7, 5, 99);

    expect(result).toEqual({
      ok: false,
      error: "Unauthorized",
      data: null,
    });
    expect(getMockedFetchAPI()).not.toHaveBeenCalled();
  });

  it("proceeds normally when passed authorizedUserId matches session user", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    // enrollmentCheck returns empty — will return error but proves userId branch passed
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await markVoyageNodeComplete(7, 5, 42);

    // Not "Unauthorized" — reached the enrollment check
    expect(result).toEqual({
      ok: false,
      error: "Enrollment not found or unauthorized",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// markVoyageNodeComplete — enrollmentCheck empty (line 355)
// ---------------------------------------------------------------------------

describe("markVoyageNodeComplete — enrollment not found", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
  });

  it("returns error when enrollmentCheck returns empty array", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    // enrollmentCheck returns [] — enrollment not found or unauthorized
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual({
      ok: false,
      error: "Enrollment not found or unauthorized",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markVoyageNodeComplete — idempotent path (line 381)
// ---------------------------------------------------------------------------

describe("markVoyageNodeComplete — idempotent (already complete)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
  });

  it("returns existing completion without creating a new one", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    const existingCompletion = {
      id: 55,
      completedAt: "2026-03-01T00:00:00.000Z",
      voyageNode: { id: 7 },
    };

    // enrollmentCheck passes
    getMockedFetchAPI().mockResolvedValueOnce([{ id: 5 }]);
    // existing completion check — returns existing record
    getMockedFetchAPI().mockResolvedValueOnce([existingCompletion]);

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: existingCompletion,
    });
    // No POST should be made — fetch mock should not have been called
    expect(global.fetch).not.toHaveBeenCalled();
    // No revalidation for idempotent return
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markVoyageNodeComplete — PUT progress update fails (lines 497-503)
// ---------------------------------------------------------------------------

describe("markVoyageNodeComplete — PUT enrollment percentage fails", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns ok:false with node data when PUT enrollment update fails", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    const createdCompletion = {
      id: 99,
      completedAt: "2026-04-08T00:00:00.000Z",
      voyageNode: { id: 7 },
    };

    // 1. enrollmentCheck passes
    getMockedFetchAPI().mockResolvedValueOnce([{ id: 5 }]);
    // 2. existing completion check — none
    getMockedFetchAPI().mockResolvedValueOnce([]);

    // POST create completion — succeeds
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: createdCompletion }),
    );

    // 3. GET enrollment to find voyage id
    const mockEnrollmentWithVoyage = {
      id: 5,
      completionPercentage: 0,
      voyage: { id: 10 },
    };
    getMockedFetchAPI().mockResolvedValueOnce([mockEnrollmentWithVoyage]);

    // 4. GET voyage nodes for percentage calc
    getMockedFetchAPI().mockResolvedValueOnce([
      { id: 7, branchType: "required" },
      { id: 8, branchType: "required" },
    ]);

    // 5. GET completions for percentage calc
    getMockedFetchAPI().mockResolvedValueOnce([
      { id: 99, voyageNode: { id: 7 } },
    ]);

    // PUT enrollment — fails
    fetchMock.mockResolvedValueOnce(makeFetchResponse({}, 500));

    jest.mocked(flattenAttributes).mockReturnValue(createdCompletion);

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual({
      ok: false,
      error: "Node marked complete but failed to update progress percentage.",
      data: createdCompletion,
    });

    // revalidateTag still called on the partial success path
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(42),
    );
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.allVoyageEnrollments);
  });
});

// ---------------------------------------------------------------------------
// markVoyageNodeComplete — outer catch (lines 521-522)
// ---------------------------------------------------------------------------

describe("markVoyageNodeComplete — outer catch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns generic error when an unexpected exception is thrown", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(SESSION_USER);
    jest.mocked(getCachedUser).mockResolvedValue(AUTH_USER);

    // enrollmentCheck throws unexpectedly
    getMockedFetchAPI().mockRejectedValueOnce(
      new Error("Unexpected DB failure"),
    );

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to mark voyage node as complete.",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// checkAndCompleteVoyageNode — checkPlaylistVoyageNode outer catch (line 677)
// ---------------------------------------------------------------------------

describe("checkAndCompleteVoyageNode — inner error swallowed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves without throwing when checkPlaylistVoyageNode throws internally", async () => {
    // fetchAPI: playlists containing droplet — returns one playlist
    getMockedFetchAPI().mockResolvedValueOnce([{ id: 7 }]);
    // fetchAPI: voyage-nodes for playlist — throws inside checkPlaylistVoyageNode
    getMockedFetchAPI().mockRejectedValueOnce(
      new Error("Strapi error inside checkPlaylist"),
    );

    // Should never surface the error
    await expect(checkAndCompleteVoyageNode(20, 42)).resolves.toBeUndefined();
  });

  it("resolves without throwing when outer playlists fetch throws", async () => {
    getMockedFetchAPI().mockRejectedValueOnce(
      new Error("Failed to fetch playlists"),
    );

    await expect(checkAndCompleteVoyageNode(20, 42)).resolves.toBeUndefined();
  });
});
