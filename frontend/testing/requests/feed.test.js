const {
  fetchAnnouncements,
  createFriendAnnouncement,
  createDropletAnnouncement,
  createKudosAnnouncement,
  createPlaylistAnnouncement,
  createGroupAnnouncement,
} = require("../../lib/requests/feed");
const { flattenAttributes } = require("../../lib/utils");

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

beforeEach(() => {
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

describe("Feed tests", () => {
  const { revalidatePath } = require("next/cache");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchAnnouncements", () => {
    it("should fetch and return announcements for a user", async () => {
      const mockUser = {
        id: 5,
        firstName: "Test",
        lastName: "User",
        email: "test.user@northeastern.edu",
      };

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

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchAnnouncements(mockUser);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/announcements\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/sort/);
      expect(callUrl).toMatch(/filters/);
      expect(callUrl).toMatch(/populate/);
      expect(callUrl).toMatch(/pagination/);

      expect(result).toEqual(expect.any(Array));
      expect(result.length).toBe(mockAnnouncements.length);
      expect(flattenAttributes).toHaveBeenCalledWith(mockStrapiResponse.data);
    });

    it("should handle fetch errors", async () => {
      const mockUser = { id: 5 };
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchAnnouncements(mockUser)).rejects.toThrow(
        "Failed to fetch announcement data.",
      );
    });
  });

  describe("createFriendAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
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
      expect(requestBody.data.authorized_user).toBe(mockUser.id);

      expect(revalidatePath).toHaveBeenCalledWith("/feed");

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
      expect(revalidatePath).not.toHaveBeenCalled();

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
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createKudosAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
      process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
      process.env.STRAPI_ACCESS_TOKEN = "test-token";
    });

    it("should successfully update kudos status and create a kudos announcement", async () => {
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

      const result = await createKudosAnnouncement(mockUser, announcementId);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `http://test-api-url/api/announcements/${announcementId}`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify({
            data: {
              kudosGiven: {
                connect: [mockUser],
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
      expect(requestBody.data.content).toContain(mockUser.firstName);
      expect(requestBody.data.content).toContain("kudos");
      expect(requestBody.data.type).toBe("kudos");
      expect(requestBody.data.authorized_user).toBe(mockUser.id);

      expect(revalidatePath).toHaveBeenCalledWith("/feed");

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
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle error in creating kudos announcement", async () => {
      const mockUser = { id: 5 };
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

      const result = await createKudosAnnouncement(mockUser, announcementId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

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
      revalidatePath.mockReset();
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
      expect(requestBody.data.playlist).toBe(playlistId);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidatePath).toHaveBeenCalledWith("/feed");

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
      expect(revalidatePath).not.toHaveBeenCalled();

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
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createGroupAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
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
      expect(requestBody.data.group).toBe(groupId);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidatePath).toHaveBeenCalledWith("/feed");

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
      expect(revalidatePath).not.toHaveBeenCalled();

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
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createDropletAnnouncement", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
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
      expect(requestBody.data.droplet).toBe(dropletId);
      expect(requestBody.data.firstCreated).toBeDefined();

      expect(revalidatePath).toHaveBeenCalledWith("/feed");

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
      expect(revalidatePath).not.toHaveBeenCalled();

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
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
