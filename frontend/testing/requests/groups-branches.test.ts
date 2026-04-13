/**
 * Branch-coverage tests for lib/requests/groups.ts
 *
 * Targets uncovered branches:
 *   607-612  enrollUsers — group.droplets?.map || [], group.playlists?.flatMap || [],
 *            group.members?.map || []
 *   645      existingEnrollment entry without authorizedUser.id or droplet.id
 *   650      pagination page++ when existingEnrollments.length === pageSize
 *   659-677  uniqueDropletIds.length > 0 path with enrollment dedup
 *   677      group.playlists.length > 0 path
 *   773      assignDropletDueDate — PUT response not ok
 *   866      assignPlaylistDueDate — first dueDatePage empty → no pagination
 *   877      assignPlaylistDueDate — existing id branch (PUT path)
 *   894      assignPlaylistDueDate — PUT response not ok
 *   1061     deleteGroup — response not ok
 *   1079     archiveGroup — response not ok (throws)
 */

import {
  enrollUsers,
  assignDropletDueDate,
  assignPlaylistDueDate,
  deleteGroup,
  archiveGroup,
} from "@/lib/requests/groups";
import { revalidateTag } from "next/cache";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
  makeDroplet,
  makeGroup,
  makeAuthorizedUser,
} from "@/lib/testing/mock-helpers";
import type { Playlist } from "@/types";

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

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
  getAuthorizedUsersByEmails: jest.fn(),
  createAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user-roles", () => ({
  getAuthorizedUserRoleIdByTitle: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  createEnrollmentDirect: jest.fn(),
}));

jest.mock("@/lib/requests/playlist-enrollment", () => ({
  enrollInPlaylist: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedFetchAPI = getMockedFetchAPI();
const { createEnrollmentDirect: mockedCreateEnrollmentDirect } =
  jest.requireMock("@/lib/requests/enrollment");
const { enrollInPlaylist: mockedEnrollInPlaylist } = jest.requireMock(
  "@/lib/requests/playlist-enrollment",
);

function makeMember(id: number) {
  return makeAuthorizedUser({
    id,
    email: `user${id}@test.com`,
    firstName: "User",
    lastName: String(id),
    timeZone: "America/New_York",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Lines 607-612 — enrollUsers: group without droplets/playlists/members
// covers || [] fallbacks for undefined collection fields
// ---------------------------------------------------------------------------

describe("groups-branches — enrollUsers || [] fallbacks (lines 607-612)", () => {
  it("returns early when members list is empty", async () => {
    const group = makeGroup({ members: [] });

    await enrollUsers(group);

    // Should not call fetchAPI at all
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(mockedCreateEnrollmentDirect).not.toHaveBeenCalled();
  });

  it("returns early when members field is undefined", async () => {
    const group = makeGroup({ members: undefined });

    await enrollUsers(group);

    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("handles group with no droplets and no playlists — only checks member count", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
      droplets: undefined,
      playlists: undefined,
    });

    // uniqueDropletIds will be [] → skip enrollment query loop
    await enrollUsers(group);

    // No fetchAPI call needed (uniqueDropletIds is empty, no playlists)
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(mockedCreateEnrollmentDirect).not.toHaveBeenCalled();
  });

  it("handles group with empty droplets and playlists arrays", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
      droplets: [],
      playlists: [],
    });

    await enrollUsers(group);

    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("handles group with playlists that have no droplets field", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
      droplets: undefined,
      playlists: [
        {
          id: 10,
          name: "P1",
          slug: "p1",
          isPublic: false,
          duration: "short" as const,
          droplets: undefined,
        },
      ],
    });

    // playlists.flatMap with undefined droplets → || [] fires
    // uniqueDropletIds = [] → skip enrollment query
    // playlists.length > 0 → run playlist enrollment
    mockedEnrollInPlaylist.mockResolvedValue(undefined);

    await enrollUsers(group);

    expect(mockedEnrollInPlaylist).toHaveBeenCalledWith(10, 1);
  });
});

// ---------------------------------------------------------------------------
// Line 645 — enrollment entry without authorizedUser.id or droplet.id
// (the if guard for building existingSet)
// ---------------------------------------------------------------------------

describe("groups-branches — enrollUsers: existingSet entries missing fields (line 645)", () => {
  it("skips enrollment entries that lack authorizedUser.id", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
      droplets: [makeDroplet({ id: 5 })],
      playlists: [],
    });

    // Existing enrollments page: one entry has no authorizedUser.id
    mockedFetchAPI.mockResolvedValueOnce([
      { authorizedUser: undefined, droplet: { id: 5 } }, // missing authorizedUser.id
    ]);

    mockedCreateEnrollmentDirect.mockResolvedValue(undefined);

    await enrollUsers(group);

    // The incomplete entry was skipped, so member 1 + droplet 5 is NOT in existingSet
    // → createEnrollmentDirect should still be called
    expect(mockedCreateEnrollmentDirect).toHaveBeenCalledWith(1, 5);
  });

  it("skips enrollment entries that lack droplet.id", async () => {
    const group = makeGroup({
      members: [makeMember(2)],
      droplets: [makeDroplet({ id: 7 })],
      playlists: [],
    });

    mockedFetchAPI.mockResolvedValueOnce([
      { authorizedUser: { id: 2 }, droplet: undefined }, // missing droplet.id
    ]);

    mockedCreateEnrollmentDirect.mockResolvedValue(undefined);

    await enrollUsers(group);

    expect(mockedCreateEnrollmentDirect).toHaveBeenCalledWith(2, 7);
  });
});

// ---------------------------------------------------------------------------
// Line 650 — pagination page++ when existingEnrollments.length === pageSize
// ---------------------------------------------------------------------------

describe("groups-branches — enrollUsers: existing-enrollment pagination (line 650)", () => {
  it("fetches the next page when first page is full (length === pageSize 250)", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
      droplets: [makeDroplet({ id: 10 })],
      playlists: [],
    });

    // Build 250 enrollment stubs for page 1 — member 1 + droplet 10 already enrolled
    const page1 = Array.from({ length: 250 }, (_, i) => ({
      authorizedUser: { id: i + 100 }, // different user IDs
      droplet: { id: 10 },
    }));

    // Page 2: empty → break
    mockedFetchAPI.mockResolvedValueOnce(page1).mockResolvedValueOnce([]);

    mockedCreateEnrollmentDirect.mockResolvedValue(undefined);

    await enrollUsers(group);

    // Two fetchAPI calls (page 1 full, page 2 empty)
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
    // Member 1 + droplet 10 is not in existingSet (different user IDs) → enrollment created
    expect(mockedCreateEnrollmentDirect).toHaveBeenCalledWith(1, 10);
  });
});

// ---------------------------------------------------------------------------
// Line 677 — group.playlists.length > 0 enqueues playlist enrollment tasks
// ---------------------------------------------------------------------------

describe("groups-branches — enrollUsers: playlist enrollment path (line 677)", () => {
  it("enqueues playlist enrollments when group has playlists", async () => {
    const group = makeGroup({
      members: [makeMember(3), makeMember(4)],
      droplets: [],
      playlists: [
        {
          id: 20,
          name: "Playlist A",
          slug: "playlist-a",
          isPublic: false,
          duration: "short" as const,
        },
        {
          id: 21,
          name: "Playlist B",
          slug: "playlist-b",
          isPublic: false,
          duration: "short" as const,
        },
      ],
    });

    mockedEnrollInPlaylist.mockResolvedValue(undefined);

    await enrollUsers(group);

    // 2 members × 2 playlists = 4 calls
    expect(mockedEnrollInPlaylist).toHaveBeenCalledTimes(4);
    expect(mockedEnrollInPlaylist).toHaveBeenCalledWith(20, 3);
    expect(mockedEnrollInPlaylist).toHaveBeenCalledWith(20, 4);
    expect(mockedEnrollInPlaylist).toHaveBeenCalledWith(21, 3);
    expect(mockedEnrollInPlaylist).toHaveBeenCalledWith(21, 4);
  });

  it("swallows enrollInPlaylist errors and logs them as failures", async () => {
    const group = makeGroup({
      members: [makeMember(5)],
      droplets: [],
      playlists: [
        {
          id: 30,
          name: "P",
          slug: "p",
          isPublic: false,
          duration: "short" as const,
        },
      ],
    });

    mockedEnrollInPlaylist.mockRejectedValue(new Error("Playlist error"));

    // Should not throw
    await expect(enrollUsers(group)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Line 773 — assignDropletDueDate: PUT response not ok → returns false
// ---------------------------------------------------------------------------

describe("groups-branches — assignDropletDueDate: PUT not ok (line 773)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("returns failure result when PUT existing due date fails", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
    });
    const droplet = makeDroplet({ id: 5 });

    // Paginated due-date lookup: existing entry for member 1
    mockedFetchAPI.mockResolvedValueOnce([
      { id: 99, dueDate: "2024-01-01", authorized_user: { id: 1 } },
    ]);

    // PUT response: not ok
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "bad request" }),
      text: async () => "bad request",
      headers: new Headers(),
    } as Response);

    const result = await assignDropletDueDate("2025-01-01", group, droplet);

    expect(result).toEqual({
      success: false,
      error: "Failed to process due dates for some users",
    });
    // revalidateTag should NOT be called (anySuccessful is false)
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 866 — assignPlaylistDueDate: empty first page → no pagination needed
// ---------------------------------------------------------------------------

describe("groups-branches — assignPlaylistDueDate: empty first page (line 866)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("handles empty existing due dates and creates new entries", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
    });
    const playlist: Playlist = {
      id: 10,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: false,
      duration: "short",
    };

    // Empty first page → break immediately
    mockedFetchAPI.mockResolvedValueOnce([]);

    // POST new due date: success
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 50 } }));

    const result = await assignPlaylistDueDate("2025-03-01", group, playlist);

    expect(result).toEqual({ success: true });
    expect(revalidateTag).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 877 — assignPlaylistDueDate: existing due date → PUT path
// ---------------------------------------------------------------------------

describe("groups-branches — assignPlaylistDueDate: existing due date PUT path (line 877)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("updates existing playlist due date via PUT", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
    });
    const playlist: Playlist = {
      id: 20,
      name: "Playlist",
      slug: "playlist",
      isPublic: false,
      duration: "short",
    };

    // Existing due date for member 1
    mockedFetchAPI.mockResolvedValueOnce([
      { id: 77, dueDate: "2024-06-01", authorized_user: { id: 1 } },
    ]);

    // PUT existing due date: success
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 77 } }));

    const result = await assignPlaylistDueDate("2025-06-01", group, playlist);

    expect(result).toEqual({ success: true });
    // Verify PUT was called (not POST)
    const putCall = fetchMock.mock.calls[0];
    expect(putCall[1]?.method).toBe("PUT");
  });
});

// ---------------------------------------------------------------------------
// Line 894 — assignPlaylistDueDate: PUT response not ok → returns false
// ---------------------------------------------------------------------------

describe("groups-branches — assignPlaylistDueDate: PUT not ok (line 894)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("returns failure when PUT existing playlist due date fails", async () => {
    const group = makeGroup({
      members: [makeMember(1)],
    });
    const playlist: Playlist = {
      id: 30,
      name: "PL",
      slug: "pl",
      isPublic: false,
      duration: "short",
    };

    mockedFetchAPI.mockResolvedValueOnce([
      { id: 88, dueDate: "2024-01-01", authorized_user: { id: 1 } },
    ]);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
      text: async () => "Server error",
      headers: new Headers(),
    } as Response);

    const result = await assignPlaylistDueDate("2025-01-01", group, playlist);

    expect(result).toEqual({
      success: false,
      error: "Failed to process due dates for some users",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 1061 — deleteGroup: response not ok
// ---------------------------------------------------------------------------

describe("groups-branches — deleteGroup: response not ok (line 1061)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("returns error when DELETE response is not ok", async () => {
    // getGroupByID uses fetchAPI
    mockedFetchAPI.mockResolvedValueOnce([{ id: 1, groupName: "G" }]);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ data: null }),
      text: async () => "forbidden",
      headers: new Headers(),
    } as Response);

    const result = await deleteGroup(1);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete group.",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 1079 — archiveGroup: response not ok → throws → catch returns failure
// ---------------------------------------------------------------------------

describe("groups-branches — archiveGroup: response not ok (line 1079)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("returns failure when PUT archive response is not ok", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    const { getAuthorizedUserByEmail } = jest.requireMock(
      "@/lib/requests/authorized-user",
    );

    getCurrentUser.mockResolvedValue({ email: "user@test.com" });
    getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });

    const group = makeGroup({ id: 5 });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" }),
      text: async () => "forbidden",
      headers: new Headers(),
    } as Response);

    const result = await archiveGroup(group, true);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
