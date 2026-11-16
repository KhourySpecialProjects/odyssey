/**
 * Coverage gap tests for lib/requests/feed.ts
 *
 * Targets uncovered lines 463-580:
 *   463-531  fetchAnnouncementById — happy path + error path
 *   533-582  fetchUserAnnouncements — happy path + error path + pagination
 *   markAnnouncementRead / markAnnouncementUnread — cache invalidation scope
 */

import {
  fetchAnnouncementById,
  fetchUserAnnouncements,
  markAnnouncementRead,
  markAnnouncementUnread,
} from "@/lib/requests/feed";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";
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
  getCachedUserSocial: jest.fn(),
}));

// ---------------------------------------------------------------------------
// fetchAnnouncementById (lines 463-531)
// ---------------------------------------------------------------------------

describe("fetchAnnouncementById", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches and returns announcement data for a given id", async () => {
    const mockAnnouncement = {
      id: 7,
      type: "system",
      content: "Welcome message",
      authorized_user: [],
    };

    jest.mocked(flattenAttributes).mockReturnValueOnce(mockAnnouncement);

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: [mockAnnouncement] }),
    );

    const result = await fetchAnnouncementById(7);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/announcements"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer"),
        }),
        next: {
          tags: [CACHE_TAGS.announcements],
          revalidate: 900,
        },
      }),
    );

    // URL should have id filter embedded in query string
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("announcements?");
    // qs encodes filters: the id value 7 should appear in the query
    expect(calledUrl).toContain("7");
    // ODY-635 R2: the schema relation is `authorized_user` (singular).
    expect(decodeURIComponent(calledUrl)).toContain(
      "populate[authorized_user][fields][0]=id",
    );
    expect(calledUrl).not.toContain("authorized_users");

    expect(result).toEqual(mockAnnouncement);
  });

  it("fetches announcement with all populated relations (users, playlist, droplet, group)", async () => {
    const mockAnnouncementWithRelations = {
      id: 42,
      type: "droplet",
      content: "New droplet announcement",
      authorized_user: [{ id: 1, email: "user@example.com" }],
      playlist: { id: 5, name: "Playlist A", slug: "playlist-a" },
      droplet: { id: 10, name: "Droplet X", slug: "droplet-x" },
      group: { id: 3, name: "Group Z", slug: "group-z" },
    };

    jest
      .mocked(flattenAttributes)
      .mockReturnValueOnce(mockAnnouncementWithRelations);

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: [mockAnnouncementWithRelations] }),
    );

    const result = await fetchAnnouncementById(42);

    expect(result).toEqual(mockAnnouncementWithRelations);
  });

  it("throws when fetch fails (error path)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"));

    await expect(fetchAnnouncementById(1)).rejects.toThrow(
      "Failed to fetch announcement data.",
    );
  });

  it("throws when response.json throws (malformed response)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as unknown as Response);

    await expect(fetchAnnouncementById(1)).rejects.toThrow(
      "Failed to fetch announcement data.",
    );
  });
});

// ---------------------------------------------------------------------------
// fetchUserAnnouncements (lines 533-582)
// ---------------------------------------------------------------------------

describe("fetchUserAnnouncements", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches announcements for a user on default page 1", async () => {
    const mockAnnouncements = [
      { id: 1, type: "friend", content: "Friend added" },
      { id: 2, type: "kudos", content: "Kudos received" },
    ];

    jest.mocked(flattenAttributes).mockReturnValueOnce(mockAnnouncements);

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: mockAnnouncements }),
    );

    const result = await fetchUserAnnouncements(42);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/announcements"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer"),
        }),
        next: {
          tags: [CACHE_TAGS.announcements],
          revalidate: 900,
        },
      }),
    );

    // URL should contain user id filter
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("announcements?");
    expect(calledUrl).toContain("42");

    expect(result).toEqual(mockAnnouncements);
  });

  it("uses provided page number in pagination", async () => {
    jest.mocked(flattenAttributes).mockReturnValueOnce([]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    await fetchUserAnnouncements(42, 3);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    // Page 3 should appear in the query string
    expect(calledUrl).toContain("page%5D=3");
  });

  it("defaults to page 1 when page parameter is omitted", async () => {
    jest.mocked(flattenAttributes).mockReturnValueOnce([]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    await fetchUserAnnouncements(42);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("page%5D=1");
  });

  it("filters announcements to friend, kudos, and droplet types", async () => {
    jest.mocked(flattenAttributes).mockReturnValueOnce([]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    await fetchUserAnnouncements(42);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    // qs encodes the $in array for type filter
    expect(calledUrl).toContain("friend");
    expect(calledUrl).toContain("kudos");
    expect(calledUrl).toContain("droplet");
  });

  it("returns empty array when user has no announcements", async () => {
    jest.mocked(flattenAttributes).mockReturnValueOnce([]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    const result = await fetchUserAnnouncements(99);

    expect(result).toEqual([]);
  });

  it("throws when fetch fails (error path)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    await expect(fetchUserAnnouncements(42)).rejects.toThrow(
      "Failed to fetch user announcements.",
    );
  });

  it("throws when response.json throws (malformed response)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as unknown as Response);

    await expect(fetchUserAnnouncements(42)).rejects.toThrow(
      "Failed to fetch user announcements.",
    );
  });
});

// ---------------------------------------------------------------------------
// markAnnouncementRead / markAnnouncementUnread — per-user read state (ODY-786)
// ---------------------------------------------------------------------------

describe("announcement read state", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let visible: { id: number; documentId: string }[];
  let existingReads: { id: number; documentId: string }[];

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));
    jest.spyOn(console, "error").mockImplementation(() => {});
    visible = [{ id: 11, documentId: "doc11" }];
    existingReads = [];
    jest
      .mocked(getCurrentUser)
      .mockResolvedValue({ id: 5, email: "me@test.com" } as never);
    jest
      .mocked(getCachedUserSocial)
      .mockResolvedValue({ friendships: [] } as never);
    jest.mocked(fetchAPI).mockImplementation((async (path: string) => {
      if (path === "/announcements") return visible;
      if (path === "/announcement-reads") return existingReads;
      return [];
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const lookup = () =>
    jest
      .mocked(fetchAPI)
      .mock.calls.find(([path]) => path === "/announcements")![1] as {
      urlParams: { filters: unknown };
    };

  // Every card type goes through the same visibility check, so every type can
  // be marked; the row written never depends on who authored the card.
  it.each([
    "droplet",
    "group",
    "playlist",
    "friend",
    "kudos",
    "system",
    "review_feedback",
    "review_published",
  ])("marks a %s announcement read for the viewer only", async (type) => {
    const result = await markAnnouncementRead(11);

    expect(result).toEqual({ success: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/announcement-reads");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      data: { announcement: "doc11", authorized_user: "doc5" },
    });
    // The shared announcement row is never written
    expect(
      fetchMock.mock.calls.some(([u]) => `${u}`.includes("/announcements")),
    ).toBe(false);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userFeed(5));
    expect(type).toBeTruthy();
  });

  it("checks the announcement is in the viewer's feed, not that they own it", async () => {
    await markAnnouncementRead(11);

    const filters = JSON.stringify(lookup().urlParams.filters);
    expect(filters).toContain('{"id":{"$eq":11}}');
    // Broadcast and targeted system rows, and review outcomes, are in the $or
    expect(filters).toContain('"type":"system"');
    expect(filters).toContain('{"authorized_user":{"id":{"$null":true}}}');
    expect(filters).toContain('"review_feedback"');
    expect(filters).toContain('"type":"reminder"');
  });

  it("does not let a viewer mark an announcement outside their feed", async () => {
    visible = [];

    const result = await markAnnouncementRead(11);

    expect(result).toEqual({ success: false, error: "Announcement not found" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a caller without a session", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(undefined as never);

    const result = await markAnnouncementRead(11);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up and writes only the viewer's own read rows", async () => {
    existingReads = [{ id: 70, documentId: "doc70" }];

    await markAnnouncementUnread(11);

    const readsCall = jest
      .mocked(fetchAPI)
      .mock.calls.find(([path]) => path === "/announcement-reads")![1] as {
      urlParams: { filters: unknown };
    };
    expect(readsCall.urlParams.filters).toEqual({
      announcement: { id: { $eq: 11 } },
      authorized_user: { id: { $eq: 5 } },
    });
  });

  it("does not add a second read row when already read", async () => {
    existingReads = [{ id: 70, documentId: "doc70" }];

    const result = await markAnnouncementRead(11);

    expect(result).toEqual({ success: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks unread by deleting the viewer's read row", async () => {
    existingReads = [{ id: 70, documentId: "doc70" }];

    const result = await markAnnouncementUnread(11);

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/announcement-reads/doc70");
    expect(init?.method).toBe("DELETE");
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userFeed(5));
    expect(revalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.announcements);
  });

  it("marking unread with nothing to remove succeeds without a write", async () => {
    const result = await markAnnouncementUnread(11);

    expect(result).toEqual({ success: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a readable error and skips revalidation when Strapi rejects the write", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({}, 500));

    const result = await markAnnouncementRead(11);

    expect(result).toEqual({ success: false, error: "Failed to mark as read" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
