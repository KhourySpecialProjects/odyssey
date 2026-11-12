const {
  fetchAnnouncements,
  createFriendAnnouncement,
  createDropletAnnouncement,
  createKudosAnnouncement,
  createPlaylistAnnouncement,
  createGroupAnnouncement,
  createSystemAnnouncement,
  getUnreadAnnouncementCount,
} = require("../../lib/requests/feed");
const { flattenAttributes } = require("../../lib/utils");
const { CACHE_TAGS } = require("../../lib/cache-tags");
const {
  resolveDocumentId,
  strapiEntryUrl,
} = require("../../lib/strapi-document-id");

jest.mock("../../lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => {
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));
    }
    return data;
  }),
}));

global.fetch = jest.fn();

// Non-identity mapping (5 -> "doc5") proves URLs and relation values are
// documentIds, not numeric ids.
const toDoc = (ref) => {
  const v = ref && typeof ref === "object" ? ref.documentId ?? ref.id : ref;
  return `doc${v}`;
};

beforeEach(() => {
  resolveDocumentId.mockImplementation(async (_c, ref) => toDoc(ref));
  strapiEntryUrl.mockImplementation(
    async (c, ref, q) =>
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${c}/${toDoc(ref)}${q ? `?${q}` : ""}`,
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("../../lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
  getCachedUserSocial: jest.fn(),
}));

describe("Feed tests", () => {
  const { revalidateTag } = require("next/cache");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchAnnouncements", () => {
    const { getCurrentUser } = require("../../lib/auth/session");
    const {
      getCachedUser,
      getCachedUserSocial,
    } = require("../../lib/requests/cached");

    const mockSocial = {
      id: 5,
      email: "test.user@northeastern.edu",
      friendships: [
        {
          authorized_users: [{ id: 5 }, { id: 10 }],
        },
      ],
    };

    // Signed-in session for user 5 (token carries the Strapi id)
    beforeEach(() => {
      getCurrentUser.mockResolvedValue({
        id: 5,
        email: "test.user@northeastern.edu",
      });
      getCachedUserSocial.mockResolvedValue(mockSocial);
    });

    function mockPrecompute() {
      const { fetchAPI } = require("../../lib/utils");
      fetchAPI
        .mockResolvedValueOnce([{ id: 1 }]) // groups
        .mockResolvedValueOnce([{ id: 2 }]) // playlists
        .mockResolvedValueOnce([{ id: 3, droplet: { id: 100 } }]); // enrollments
    }

    function mockAnnouncementsResponse(data = []) {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data, meta: { pagination: { pageCount: 1 } } }),
      });
    }

    it("should fetch and return announcements for a user", async () => {
      const { fetchAPI } = require("../../lib/utils");

      const mockAnnouncements = [
        {
          id: 1,
          content: "Test announcement 1",
          type: "system",
          firstCreated: "2023-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          content: "Test announcement 2",
          type: "friend",
          firstCreated: "2023-01-02T00:00:00.000Z",
        },
      ];

      const mockStrapiResponse = {
        data: mockAnnouncements.map((announcement) => ({
          id: announcement.id,
          attributes: {
            content: announcement.content,
            type: announcement.type,
            firstCreated: announcement.firstCreated,
          },
        })),
      };

      // Mock the 3 parallel pre-compute queries via fetchAPI
      mockPrecompute();

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchAnnouncements();

      // fetchAPI called 3 times for pre-compute
      expect(fetchAPI).toHaveBeenCalledTimes(3);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/announcements\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          next: {
            tags: [CACHE_TAGS.announcements, CACHE_TAGS.userFeed(5)],
            revalidate: 900,
          },
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/sort/);
      expect(callUrl).toMatch(/filters/);
      expect(callUrl).toMatch(/populate/);
      expect(callUrl).toMatch(/pagination/);

      expect(result.data).toEqual(expect.any(Array));
      expect(result.data.length).toBe(mockAnnouncements.length);
      expect(flattenAttributes).toHaveBeenCalledWith(mockStrapiResponse.data);
    });

    it("scopes the query to the session user and their friends from the server-side social graph", async () => {
      const { fetchAPI } = require("../../lib/utils");
      mockPrecompute();
      mockAnnouncementsResponse();

      await fetchAnnouncements(2, ["friend", "system"], { archived: true });

      expect(getCachedUserSocial).toHaveBeenCalledWith(
        "test.user@northeastern.edu",
      );
      // Pre-compute lookups are keyed on the session user's id
      for (const [, options] of fetchAPI.mock.calls) {
        expect(JSON.stringify(options.urlParams.filters)).toContain(
          '{"$eq":5}',
        );
      }
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      // Friend 10 comes from the social graph; the viewer is excluded
      expect(url).toContain("[authorized_user][id][$in][0]=10");
      expect(url).not.toContain("[authorized_user][id][$in][1]");
      expect(url).toContain("[authorized_user][id][$eq]=5");
      expect(url).toContain("[type][$in][0]=friend");
      expect(url).toContain("[type][$in][1]=system");
      expect(url).toContain("[readAt][$notNull]=true");
      expect(url).toContain("pagination[page]=2");
    });

    it("keeps reminders out of the group and playlist branches", async () => {
      mockPrecompute();
      mockAnnouncementsResponse();

      await fetchAnnouncements(1);

      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      // Guard so a reminder with group/playlist set stays owner-only
      const branchOf = (key) =>
        url.match(new RegExp(`\\[\\$or\\]\\[(\\d+)\\]\\[${key}\\]`))[1];
      for (const key of ["group", "playlist"]) {
        expect(url).toContain(`[$or][${branchOf(key)}][type][$ne]=reminder`);
      }
    });

    it("includes the user's own review announcements and no one else's", async () => {
      mockPrecompute();
      mockAnnouncementsResponse();

      await fetchAnnouncements(1);

      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[type][$in][0]=review_feedback");
      expect(url).toContain("[type][$in][1]=review_published");
      const i = url.indexOf("[type][$in][1]=review_published");
      expect(url.slice(i)).toContain("[authorized_user][id][$eq]=5");
    });

    it("includes only the viewer's own reminders", async () => {
      mockPrecompute();
      mockAnnouncementsResponse();

      await fetchAnnouncements(1);

      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      const i = url.indexOf("[type]=reminder");
      expect(i).toBeGreaterThan(-1);
      expect(url.slice(i, i + 80)).toContain("[authorized_user][id][$eq]=5");
    });

    describe("reminder rows", () => {
      const reminderRow = (dropletId = 100) => ({
        id: 9,
        attributes: {
          type: "reminder",
          content: "x",
          droplet: { id: dropletId, name: "Git", slug: "git" },
        },
      });
      const lessons = [2, 1].map((n) => ({
        id: n,
        name: `L${n}`,
        slug: `l${n}`,
        orderIndex: n,
      }));

      it("attaches progress, Up next, the earliest due date and the headline", async () => {
        const { fetchAPI } = require("../../lib/utils");
        mockPrecompute();
        fetchAPI
          .mockResolvedValueOnce([
            { droplet: { id: 100, lessons }, viewedLessons: [{ id: 1 }] },
          ])
          .mockResolvedValueOnce([
            {
              dueDate: "2026-12-02",
              droplet: { id: 100 },
              group: { groupName: "B" },
            },
            {
              dueDate: "2026-12-01",
              droplet: { id: 100 },
              group: { groupName: "A" },
            },
          ]);
        mockAnnouncementsResponse([reminderRow()]);

        const { data } = await fetchAnnouncements(1);

        expect(data[0].reminder).toEqual({
          headline: "You're one lesson away from finishing Git!",
          progress: { viewed: 1, total: 2 },
          nextLesson: { name: "L2", slug: "l2" },
          started: true,
          dueDate: "2026-12-01",
          dueGroupName: "A",
        });
        const [, dueOpts] = fetchAPI.mock.calls[4];
        expect(dueOpts.urlParams.filters.dueDate).toEqual({ $notNull: true });
        expect(dueOpts.urlParams.sort).toEqual(["dueDate:asc"]);
        const [, enrollmentOpts] = fetchAPI.mock.calls[3];
        expect(enrollmentOpts.next.tags).toEqual([
          CACHE_TAGS.enrollments(5),
          CACHE_TAGS.droplets,
        ]);
      });

      it("keeps the card without progress when there is no enrollment", async () => {
        const { fetchAPI } = require("../../lib/utils");
        mockPrecompute();
        fetchAPI.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        mockAnnouncementsResponse([reminderRow()]);

        const { data } = await fetchAnnouncements(1);

        expect(data[0].reminder).toMatchObject({
          headline: "Pick up Git where you left off.",
          progress: null,
          nextLesson: null,
        });
      });

      it("makes no extra queries when the page has no reminders", async () => {
        const { fetchAPI } = require("../../lib/utils");
        mockPrecompute();
        mockAnnouncementsResponse([
          { id: 1, attributes: { type: "system", content: "x" } },
        ]);

        await fetchAnnouncements(1);

        expect(fetchAPI).toHaveBeenCalledTimes(3);
      });
    });

    it("ignores a user object passed by the caller", async () => {
      const { fetchAPI } = require("../../lib/utils");
      mockPrecompute();
      mockAnnouncementsResponse();

      // An old-style call trying to read user 99's feed
      await fetchAnnouncements(
        { id: 99, friendships: [{ authorized_users: [{ id: 77 }] }] },
        ["friend"],
      );

      const allParams = JSON.stringify(fetchAPI.mock.calls);
      expect(allParams).not.toContain("99");
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).not.toContain("=99");
      expect(url).not.toContain("=77");
      expect(url).toContain("[authorized_user][id][$eq]=5");
      // A non-numeric page falls back to page 1
      expect(url).toContain("pagination[page]=1");
      expect(global.fetch.mock.calls[0][1].next.tags).toEqual([
        CACHE_TAGS.announcements,
        CACHE_TAGS.userFeed(5),
      ]);
    });

    it("falls back to the email lookup for tokens without an id", async () => {
      const { fetchAPI } = require("../../lib/utils");
      getCurrentUser.mockResolvedValue({ email: "test.user@northeastern.edu" });
      getCachedUser.mockResolvedValue({ id: 5 });
      mockPrecompute();
      mockAnnouncementsResponse();

      await fetchAnnouncements(1);

      expect(getCachedUser).toHaveBeenCalledWith("test.user@northeastern.edu");
      expect(fetchAPI).toHaveBeenCalledTimes(3);
      expect(global.fetch.mock.calls[0][1].next.tags).toContain(
        CACHE_TAGS.userFeed(5),
      );
    });

    it("rejects without a signed-in user and queries nothing", async () => {
      const { fetchAPI } = require("../../lib/utils");
      getCurrentUser.mockResolvedValue(undefined);

      await expect(fetchAnnouncements(1)).rejects.toThrow("Not authenticated");
      expect(fetchAPI).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch errors", async () => {
      const { fetchAPI } = require("../../lib/utils");

      // Mock pre-compute queries to succeed, but the main fetch fails
      fetchAPI
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchAnnouncements()).rejects.toThrow(
        "Failed to fetch announcement data.",
      );
    });
  });

  describe("getUnreadAnnouncementCount", () => {
    it("counts the session user's unread feed", async () => {
      const { getCurrentUser } = require("../../lib/auth/session");
      const { getCachedUserSocial } = require("../../lib/requests/cached");
      const { fetchAPI } = require("../../lib/utils");
      getCurrentUser.mockResolvedValue({ id: 5, email: "a@b.edu" });
      getCachedUserSocial.mockResolvedValue({ id: 5, friendships: [] });
      fetchAPI.mockResolvedValue([]);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { pagination: { total: 7 } } }),
      });

      await expect(getUnreadAnnouncementCount()).resolves.toBe(7);
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[readAt][$null]=true");
    });

    function setupCount(total = 3) {
      const { getCurrentUser } = require("../../lib/auth/session");
      const { getCachedUserSocial } = require("../../lib/requests/cached");
      const { fetchAPI } = require("../../lib/utils");
      getCurrentUser.mockResolvedValue({ id: 5, email: "a@b.edu" });
      getCachedUserSocial.mockResolvedValue({ id: 5, friendships: [] });
      fetchAPI.mockResolvedValue([]);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { pagination: { total } } }),
      });
    }

    it("counts the Unread tab's default types, reminders included", async () => {
      setupCount();
      await getUnreadAnnouncementCount();
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[$and][2][type][$in][0]=droplet");
      expect(url).toContain("[$and][2][type][$in][6]=reminder");
      expect(url).not.toContain("[$and][2][type][$in][7]");
    });

    it("leaves global broadcasts out but keeps the viewer's own", async () => {
      setupCount();
      await getUnreadAnnouncementCount();
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[type]=system");
      expect(url).toContain("[authorized_user][id][$eq]=5");
      expect(url).not.toContain("[authorized_user][id][$null]");
    });

    it("counts the given filter selection", async () => {
      setupCount();
      await getUnreadAnnouncementCount(["kudos", 4]);
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[$and][2][type][$in][0]=kudos");
      expect(url).not.toContain("[$and][2][type][$in][1]");
    });

    it("is 0 with no types selected, without querying", async () => {
      setupCount();
      await expect(getUnreadAnnouncementCount([])).resolves.toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("still returns broadcasts to the feed itself", async () => {
      setupCount();
      await fetchAnnouncements(1, ["system"]);
      const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
      expect(url).toContain("[authorized_user][id][$null]=true");
    });
  });

  describe("createFriendAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("should successfully create a friend announcement", async () => {
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const mockUser = {
        id: 5,
        firstName: "Test",
        lastName: "User",
        email: "test.user@northeastern.edu",
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createFriendAnnouncement(mockDroplet, mockUser);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining(mockUser.firstName),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toContain(mockUser.firstName);
      expect(requestBody.data.content).toContain(mockUser.lastName);
      expect(requestBody.data.content).toContain(mockDroplet.name);
      expect(requestBody.data.type).toBe("friend");
      expect(requestBody.data.droplet).toBe(`doc${mockDroplet.id}`);
      // Only numeric ids are passed: the entities come from the caller.
      expect(resolveDocumentId).toHaveBeenCalledWith(
        "droplets",
        mockDroplet.id,
      );
      expect(resolveDocumentId).toHaveBeenCalledWith(
        "authorized-users",
        mockUser.id,
      );
      expect(requestBody.data.authorized_user).toBe(`doc${mockUser.id}`);

      expect(revalidateTag).toHaveBeenCalledWith("announcements");

      expect(result).toEqual({ success: true });
    });

    it("should handle case when user has no firstName/lastName", async () => {
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const mockUser = { id: 5, email: "anonymous@northeastern.edu" };

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      await createFriendAnnouncement(mockDroplet, mockUser);

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toContain(mockUser.email);
      expect(requestBody.data.content).toContain(mockDroplet.name);
    });

    it("should handle API errors when creating a friend announcement", async () => {
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const mockUser = { id: 5 };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createFriendAnnouncement(mockDroplet, mockUser);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when creating a friend announcement", async () => {
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const mockUser = { id: 5 };

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createFriendAnnouncement(mockDroplet, mockUser);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createKudosAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
      process.env.STRAPI_ACCESS_TOKEN = "test-token";
    });

    it("should successfully update kudos status and create a kudos announcement", async () => {
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const mockUser = {
        id: 5,
        firstName: "Test",
        lastName: "User",
        email: "test.user@northeastern.edu",
      };
      const announcementId = 123;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: announcementId } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 456 } }),
        });

      const result = await createKudosAnnouncement(
        mockUser,
        announcementId,
        mockDroplet,
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `http://test-api-url/api/announcements/doc${announcementId}`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify({
            data: {
              kudosGiven: {
                connect: [`doc${mockUser.id}`],
              },
            },
          }),
        }),
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining("kudos"),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[1][1].body);
      // expect(requestBody.data.content).toContain(mockUser.firstName);
      expect(requestBody.data.content).toContain("kudos");
      expect(requestBody.data.type).toBe("kudos");
      expect(requestBody.data.authorized_user).toBe(`doc${mockUser.id}`);

      expect(revalidateTag).toHaveBeenCalledWith("announcements");

      expect(result).toEqual({ success: true });
    });

    it("should handle error in updating kudos status", async () => {
      const mockUser = { id: 5 };
      const announcementId = 123;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        createKudosAnnouncement(mockUser, announcementId),
      ).rejects.toThrow("Failed to update kudos status");

      expect(global.fetch).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it("should handle error in creating kudos announcement", async () => {
      const mockUser = { id: 5 };
      const mockDroplet = { id: 101, name: "Test Droplet" };
      const announcementId = 123;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: announcementId } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => "Bad Request",
        });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createKudosAnnouncement(
        mockUser,
        announcementId,
        mockDroplet,
      );

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const mockUser = { id: 5 };
      const announcementId = 123;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        createKudosAnnouncement(mockUser, announcementId),
      ).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("createPlaylistAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("should successfully create a playlist announcement", async () => {
      const playlistName = "Test Playlist";
      const playlistId = 101;

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createPlaylistAnnouncement(playlistName, playlistId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining(playlistName),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toContain(playlistName);
      expect(requestBody.data.type).toBe("playlist");
      expect(requestBody.data.playlist).toBe(`doc${playlistId}`);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidateTag).toHaveBeenCalledWith("announcements");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when creating a playlist announcement", async () => {
      const playlistName = "Test Playlist";
      const playlistId = 101;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createPlaylistAnnouncement(playlistName, playlistId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when creating a playlist announcement", async () => {
      const playlistName = "Test Playlist";
      const playlistId = 101;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createPlaylistAnnouncement(playlistName, playlistId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createGroupAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("should successfully create a group announcement", async () => {
      const groupName = "Test Group";
      const groupId = 101;

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createGroupAnnouncement(groupName, groupId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining(groupName),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toContain(groupName);
      expect(requestBody.data.type).toBe("group");
      expect(requestBody.data.group).toBe(`doc${groupId}`);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidateTag).toHaveBeenCalledWith("announcements");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when creating a group announcement", async () => {
      const groupName = "Test Group";
      const groupId = 101;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createGroupAnnouncement(groupName, groupId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when creating a group announcement", async () => {
      const groupName = "Test Group";
      const groupId = 101;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createGroupAnnouncement(groupName, groupId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createDropletAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("should successfully create a droplet announcement", async () => {
      const dropletName = "Test Droplet";
      const dropletId = 101;

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createDropletAnnouncement(dropletName, dropletId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining(dropletName),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toContain(dropletName);
      expect(requestBody.data.type).toBe("droplet");
      expect(requestBody.data.droplet).toBe(`doc${dropletId}`);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidateTag).toHaveBeenCalledWith("announcements");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when creating a droplet announcement", async () => {
      const dropletName = "Test Droplet";
      const dropletId = 101;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createDropletAnnouncement(dropletName, dropletId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when creating a droplet announcement", async () => {
      const dropletName = "Test Droplet";
      const dropletId = 101;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createDropletAnnouncement(dropletName, dropletId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createSystemAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
      const { fetchAPI } = require("../../lib/utils");
      fetchAPI.mockReset();
    });

    it("should successfully create a system announcement and revalidate", async () => {
      const mockAuthUser = { id: 5, email: "admin@northeastern.edu" };
      const content = "System maintenance scheduled";

      // Mock fetchAPI to return no existing announcements (duplicate check)
      const { fetchAPI } = require("../../lib/utils");
      fetchAPI.mockResolvedValueOnce([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const result = await createSystemAnnouncement(content, mockAuthUser);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/announcements"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.data.content).toBe(content);
      expect(requestBody.data.authorized_user).toBe(`doc${mockAuthUser.id}`);
      expect(requestBody.data.type).toBe("system");
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidateTag).toHaveBeenCalledWith("announcements");
      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when creating a system announcement", async () => {
      const mockAuthUser = { id: 5 };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const result = await createSystemAnnouncement("Test", mockAuthUser);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
