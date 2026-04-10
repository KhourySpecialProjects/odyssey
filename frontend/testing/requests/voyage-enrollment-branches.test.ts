/**
 * Branch-coverage tests for lib/requests/voyage-enrollment.ts
 *
 * Targets uncovered branches:
 *   166   responseData.error?.message || "Failed to enroll in voyage" — message absent
 *   326   markVoyageNodeComplete — authorizedUser not found (getCachedUser returns null)
 *   410   completionData.error?.message || "Failed to mark node as complete" — message absent
 *   581   checkPlaylistVoyageNode — voyageNodes.length === 0 → early return
 *   595   dropletIds ?? [] — playlistDroplets[0].droplets is undefined
 *   599   dropletIds.length === 0 → early return
 *   624   node.voyage?.id is falsy → continue (skip node)
 */

import {
  enrollInVoyage,
  markVoyageNodeComplete,
  checkAndCompleteVoyageNode,
} from "@/lib/requests/voyage-enrollment";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
  makeAuthorizedUser,
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

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/voyage-progress", () => ({
  computeCompletionPercentage: jest.fn(() => 50),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedFetchAPI = getMockedFetchAPI();
const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedGetCachedUser = jest.mocked(getCachedUser);
const mockedRequireRole = jest.mocked(requireRole);

function makeAuthGate(userId = 1, roles: AuthorizedUserRoleTitle[] = []) {
  return {
    ok: true as const,
    user: { id: userId, email: "user@test.com", roles, isActive: true },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Line 166 — responseData.error?.message || "Failed to enroll in voyage"
// when the POST response has error: {} (no message key)
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — enroll error fallback message (line 166)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("uses fallback message when error object has no message property", async () => {
    mockedRequireRole.mockResolvedValue(makeAuthGate(1, []));
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 1 }));

    // Voyage is published
    mockedFetchAPI.mockResolvedValueOnce({ id: 5, status: "published" });
    // No existing enrollment
    mockedFetchAPI.mockResolvedValueOnce([]);

    // POST enrollment: ok=false with error having no message
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: {} }),
      text: async () => "{}",
      headers: new Headers(),
    } as Response);

    const result = await enrollInVoyage(5);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to enroll in voyage");
  });

  it("uses fallback message when responseData has no error field", async () => {
    mockedRequireRole.mockResolvedValue(makeAuthGate(1, []));
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 1 }));

    mockedFetchAPI.mockResolvedValueOnce({ id: 5, status: "published" });
    mockedFetchAPI.mockResolvedValueOnce([]);

    // POST enrollment: ok=false with no error field
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "{}",
      headers: new Headers(),
    } as Response);

    const result = await enrollInVoyage(5);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to enroll in voyage");
  });
});

// ---------------------------------------------------------------------------
// Line 326 — markVoyageNodeComplete — getCachedUser returns null
// (authorizedUser not found)
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — markVoyageNodeComplete authorized user not found (line 326)", () => {
  beforeEach(() => {
    mockGlobalFetch();
  });

  it("returns error when getCachedUser returns null", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      email: "user@test.com",
      roles: [],
      isActive: true,
    });
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 0 }));

    const result = await markVoyageNodeComplete(1, 2);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Authorized user not found");
  });

  it("returns error when getCachedUser returns object without id", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      email: "user@test.com",
      roles: [],
      isActive: true,
    });
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 0 }));

    const result = await markVoyageNodeComplete(1, 2);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Authorized user not found");
  });
});

// ---------------------------------------------------------------------------
// Line 410 — completionData.error?.message || "Failed to mark node as complete"
// when POST voyage-node-completions returns error with no message
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — completion error fallback message (line 410)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("uses fallback message when completion error has no message", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      email: "user@test.com",
      roles: [],
      isActive: true,
    });
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 1 }));

    // enrollmentCheck — finds enrollment
    mockedFetchAPI.mockResolvedValueOnce([{ id: 10 }]);
    // existing completion check — none found
    mockedFetchAPI.mockResolvedValueOnce([]);

    // POST voyage-node-completions: error without message
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: {} }),
      text: async () => "{}",
      headers: new Headers(),
    } as Response);

    const result = await markVoyageNodeComplete(1, 10);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to mark node as complete");
  });

  it("uses fallback message when completionData has no error field at all", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      email: "user@test.com",
      roles: [],
      isActive: true,
    });
    mockedGetCachedUser.mockResolvedValue(makeAuthorizedUser({ id: 1 }));

    mockedFetchAPI.mockResolvedValueOnce([{ id: 10 }]);
    mockedFetchAPI.mockResolvedValueOnce([]);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "{}",
      headers: new Headers(),
    } as Response);

    const result = await markVoyageNodeComplete(1, 10);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to mark node as complete");
  });
});

// ---------------------------------------------------------------------------
// Line 581 — checkPlaylistVoyageNode: voyageNodes.length === 0 → early return
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — checkAndCompleteVoyageNode: no voyage nodes (line 581)", () => {
  it("returns early when no voyage nodes reference the playlist", async () => {
    // playlists containing droplet 5
    mockedFetchAPI.mockResolvedValueOnce([{ id: 99 }]);
    // voyage nodes for playlist 99 → empty
    mockedFetchAPI.mockResolvedValueOnce([]);

    // Should resolve without error and without making further calls
    await expect(checkAndCompleteVoyageNode(5, 1)).resolves.toBeUndefined();

    // Only 2 fetchAPI calls (playlists + voyage-nodes) — no further progress
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Lines 595 + 599 — dropletIds ?? [] and dropletIds.length === 0 early return
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — checkAndCompleteVoyageNode: no droplets in playlist (lines 595, 599)", () => {
  it("returns early when playlist has no droplets (dropletIds ?? [] = [])", async () => {
    // playlists containing droplet 7
    mockedFetchAPI.mockResolvedValueOnce([{ id: 88 }]);
    // voyage nodes for playlist 88 — has a node
    mockedFetchAPI.mockResolvedValueOnce([{ id: 200, voyage: { id: 10 } }]);
    // playlistDroplets: playlist exists but no droplets field → ?? []
    mockedFetchAPI.mockResolvedValueOnce([{ id: 88 }]); // no droplets property

    await expect(checkAndCompleteVoyageNode(7, 1)).resolves.toBeUndefined();

    // Stopped after fetching playlist droplets (3 calls total)
    expect(mockedFetchAPI).toHaveBeenCalledTimes(3);
  });

  it("returns early when playlist droplets array is empty", async () => {
    mockedFetchAPI.mockResolvedValueOnce([{ id: 88 }]);
    mockedFetchAPI.mockResolvedValueOnce([{ id: 200, voyage: { id: 10 } }]);
    // playlistDroplets[0].droplets is an empty array
    mockedFetchAPI.mockResolvedValueOnce([{ id: 88, droplets: [] }]);

    await expect(checkAndCompleteVoyageNode(7, 1)).resolves.toBeUndefined();

    expect(mockedFetchAPI).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Line 624 — node.voyage?.id is falsy → continue (skip to next node)
// ---------------------------------------------------------------------------

describe("voyage-enrollment-branches — checkAndCompleteVoyageNode: node with no voyage id (line 624)", () => {
  it("skips nodes where voyage.id is undefined and continues to next", async () => {
    // playlists containing droplet 3
    mockedFetchAPI.mockResolvedValueOnce([{ id: 50 }]);
    // voyage nodes — first node has no voyage.id, second has valid voyage.id
    mockedFetchAPI.mockResolvedValueOnce([
      { id: 300 }, // no voyage field → voyage?.id is undefined → continue
      { id: 301, voyage: { id: 20 } },
    ]);
    // playlistDroplets: has 1 droplet
    mockedFetchAPI.mockResolvedValueOnce([{ id: 50, droplets: [{ id: 3 }] }]);
    // completedEnrollments: all droplets complete (1 of 1)
    mockedFetchAPI.mockResolvedValueOnce([{ id: 900 }]);
    // voyage-enrollments for node 301's voyage
    mockedFetchAPI.mockResolvedValueOnce([{ id: 1000 }]);
    // existing completions for node 301
    mockedFetchAPI.mockResolvedValueOnce([{ id: 2000 }]); // already complete → skip markVoyageNodeComplete

    await expect(checkAndCompleteVoyageNode(3, 1)).resolves.toBeUndefined();

    // Should have made calls past the "skip" — node 300 was skipped
    // The node without voyage.id should not generate a voyage-enrollments lookup
    expect(mockedFetchAPI).toHaveBeenCalledTimes(6);
  });

  it("skips node where voyage is undefined entirely", async () => {
    mockedFetchAPI.mockResolvedValueOnce([{ id: 55 }]);
    // Single node with no voyage property at all
    mockedFetchAPI.mockResolvedValueOnce([
      { id: 400 }, // voyage undefined → continue
    ]);
    mockedFetchAPI.mockResolvedValueOnce([{ id: 55, droplets: [{ id: 10 }] }]);
    // completedEnrollments
    mockedFetchAPI.mockResolvedValueOnce([{ id: 901 }]);

    await expect(checkAndCompleteVoyageNode(10, 2)).resolves.toBeUndefined();

    // 4 calls: playlists, voyage-nodes, playlist-droplets, completed-enrollments
    // No further calls because the single node was skipped
    expect(mockedFetchAPI).toHaveBeenCalledTimes(4);
  });
});
