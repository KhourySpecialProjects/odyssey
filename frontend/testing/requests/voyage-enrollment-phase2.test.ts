/**
 * Phase 2 security tests for enrollInVoyage.
 *
 * Verifies that the draft voyage enrollment bypass (SEV-1) is fixed:
 * - Unauthenticated users are blocked.
 * - Students cannot enroll in draft voyages.
 * - Students can enroll in published voyages.
 * - Non-existent voyages return not_found.
 * - SysAdmin and Faculty can enroll in draft voyages for testing purposes.
 *
 * These tests live in a NEW file to avoid conflicts with the existing
 * testing/requests/voyage-enrollment.test.ts (other session constraint).
 */

import { enrollInVoyage } from "@/lib/requests/voyage-enrollment";
import { fetchAPI } from "@/lib/utils";
import { requireRole } from "@/lib/auth/require-role";
import { getCachedUser } from "@/lib/requests/cached";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { AuthorizedUser } from "@/types";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
  assertOk,
} from "@/lib/testing/mock-helpers";

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

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal AuthorizedUser fixture — production code only reads .id from this. */
const AUTHORIZED_USER: AuthorizedUser = {
  id: 42,
  email: "student@example.com",
  roles: [],
  isEnabled: true,
  isPublic: false,
  linkedin: "",
  github: "",
  website: "",
  firstTime: false,
  firstName: "Test",
  lastName: "Student",
  bio: "",
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York",
  groups: [],
};

function makeStudentGate(
  roles: AuthorizedUserRoleTitle[] = [AuthorizedUserRoleTitle.User],
) {
  return {
    ok: true as const,
    user: {
      id: AUTHORIZED_USER.id,
      email: AUTHORIZED_USER.email,
      roles,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockedRequireRole() {
  return jest.mocked(requireRole);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enrollInVoyage — Phase 2 security (draft bypass fix)", () => {
  let mockedFetch: ReturnType<typeof mockGlobalFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch = mockGlobalFetch();
  });

  // 1. Unauthenticated
  it("returns unauthenticated when the caller has no session", async () => {
    mockedRequireRole().mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });

    const result = await enrollInVoyage(10);

    expect(result).toEqual({ ok: false, error: "unauthenticated", data: null });
    expect(getMockedFetchAPI()).not.toHaveBeenCalled();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // 2. Authenticated student enrolling in a published voyage — succeeds
  it("allows a student to enroll in a published voyage", async () => {
    mockedRequireRole().mockResolvedValue(makeStudentGate());
    jest.mocked(getCachedUser).mockResolvedValue(AUTHORIZED_USER);

    const publishedVoyage = { id: 10, status: "published" };
    const createdEnrollment = {
      id: 5,
      enrolledAt: "2026-04-10T00:00:00.000Z",
      completionPercentage: 0,
    };

    const mockedFetchAPI = getMockedFetchAPI();
    // 1. fetchAPI for voyage status check
    mockedFetchAPI.mockResolvedValueOnce(publishedVoyage);
    // 2. fetchAPI for getVoyageEnrollment (not enrolled yet)
    mockedFetchAPI.mockResolvedValueOnce([]);

    // POST enrollment
    mockedFetch.mockResolvedValueOnce(
      makeFetchResponse({ data: createdEnrollment }),
    );

    const result = await enrollInVoyage(10);

    assertOk(result);
    expect(result.ok).toBe(true);

    // Voyage status was fetched with cache: "no-store"
    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/voyages/10",
      expect.objectContaining({
        urlParams: expect.objectContaining({ fields: ["id", "status"] }),
        cache: "no-store",
      }),
    );
  });

  // 3. Authenticated student enrolling in a draft voyage — forbidden
  it("blocks a student from enrolling in a draft voyage", async () => {
    mockedRequireRole().mockResolvedValue(makeStudentGate());
    jest.mocked(getCachedUser).mockResolvedValue(AUTHORIZED_USER);

    const draftVoyage = { id: 10, status: "draft" };
    getMockedFetchAPI().mockResolvedValueOnce(draftVoyage);

    const result = await enrollInVoyage(10);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    // POST must never be reached
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // 4. Voyage does not exist (fetchAPI returns null) — not_found
  it("returns not_found when the voyage does not exist", async () => {
    mockedRequireRole().mockResolvedValue(makeStudentGate());
    jest.mocked(getCachedUser).mockResolvedValue(AUTHORIZED_USER);

    getMockedFetchAPI().mockResolvedValueOnce(null);

    const result = await enrollInVoyage(99);

    expect(result).toEqual({ ok: false, error: "not_found", data: null });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // 5. SysAdmin enrolling in a draft voyage — succeeds (staff exception)
  it("allows a SysAdmin to enroll in a draft voyage", async () => {
    mockedRequireRole().mockResolvedValue(
      makeStudentGate([AuthorizedUserRoleTitle.SysAdmin]),
    );
    jest.mocked(getCachedUser).mockResolvedValue(AUTHORIZED_USER);

    const draftVoyage = { id: 10, status: "draft" };
    const createdEnrollment = {
      id: 6,
      enrolledAt: "2026-04-10T00:00:00.000Z",
      completionPercentage: 0,
    };

    const mockedFetchAPI = getMockedFetchAPI();
    // 1. voyage status
    mockedFetchAPI.mockResolvedValueOnce(draftVoyage);
    // 2. getVoyageEnrollment (not enrolled)
    mockedFetchAPI.mockResolvedValueOnce([]);

    mockedFetch.mockResolvedValueOnce(
      makeFetchResponse({ data: createdEnrollment }),
    );

    const result = await enrollInVoyage(10);

    expect(result.ok).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // 6. Faculty enrolling in a draft voyage — succeeds (staff exception)
  it("allows a Faculty member to enroll in a draft voyage", async () => {
    mockedRequireRole().mockResolvedValue(
      makeStudentGate([AuthorizedUserRoleTitle.Faculty]),
    );
    jest.mocked(getCachedUser).mockResolvedValue(AUTHORIZED_USER);

    const draftVoyage = { id: 10, status: "draft" };
    const createdEnrollment = {
      id: 7,
      enrolledAt: "2026-04-10T00:00:00.000Z",
      completionPercentage: 0,
    };

    const mockedFetchAPI = getMockedFetchAPI();
    // 1. voyage status
    mockedFetchAPI.mockResolvedValueOnce(draftVoyage);
    // 2. getVoyageEnrollment (not enrolled)
    mockedFetchAPI.mockResolvedValueOnce([]);

    mockedFetch.mockResolvedValueOnce(
      makeFetchResponse({ data: createdEnrollment }),
    );

    const result = await enrollInVoyage(10);

    expect(result.ok).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
