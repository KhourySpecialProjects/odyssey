/**
 * Coverage gap tests for lib/requests/feed.ts
 *
 * Targets uncovered lines 463-580:
 *   463-531  fetchAnnouncementById — happy path + error path
 *   533-582  fetchUserAnnouncements — happy path + error path + pagination
 */

import {
  fetchAnnouncementById,
  fetchUserAnnouncements,
} from "@/lib/requests/feed";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { flattenAttributes } from "@/lib/utils";
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
      authorized_users: [],
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

    expect(result).toEqual(mockAnnouncement);
  });

  it("fetches announcement with all populated relations (users, playlist, droplet, group)", async () => {
    const mockAnnouncementWithRelations = {
      id: 42,
      type: "droplet",
      content: "New droplet announcement",
      authorized_users: [{ id: 1, email: "user@example.com" }],
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
