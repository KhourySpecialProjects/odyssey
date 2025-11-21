const {
  getAuthorizedUserRoleIdByTitle,
} = require("../../lib/requests/authorized-user-roles");
const { fetchAPI } = require("../../lib/utils");
const {
  fetchDroplets,
  fetchGroups,
  fetchAccessRequests,
  fetchReports,
} = require("../../lib/requests/data");
const {
  getDroplets,
  getDropletBySlug,
  getDropletById,
  getDraftDroplets,
} = require("../../lib/requests/droplet");
const { getLessonBySlug } = require("../../lib/requests/lesson");
const {
  togglePlaylistEnrollment,
  enrollInPlaylist,
} = require("../../lib/requests/playlist-enrollment");
const {
  getPlaylistById,
  getPlaylistBySlug,
  getPlaylists,
} = require("../../lib/requests/playlist");
const { getTags, getTagBySlug } = require("../../lib/requests/tag");
const { getCurrentUser } = require("../../lib/auth/session");
const {
  getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");

const mockGroups = require("../mocks/groupsMock");

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

jest.mock("../../lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

describe("getAuthorizedUserRoleIdByTitle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the role ID for a given title", async () => {
    const mockRole = {
      id: 1,
      title: "User",
    };

    fetchAPI.mockResolvedValue([mockRole]);

    const result = await getAuthorizedUserRoleIdByTitle("User");
    expect(result).toBe(1);
    expect(fetchAPI).toHaveBeenCalledWith("/authorized-user-roles", {
      urlParams: expect.objectContaining({
        filters: {
          title: { $eq: "User" },
        },
        pagination: {
          pageSize: 1,
          page: 1,
        },
      }),
    });
  });

  it("should handle error", async () => {
    fetchAPI.mockRejectedValue(new Error("Failed to fetch role"));

    await expect(getAuthorizedUserRoleIdByTitle("Invalid")).rejects.toThrow(
      "Failed to fetch role",
    );
  });
});

describe("Data requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchDroplets", () => {
    it("should fetch and return droplets", async () => {
      const mockDroplets = [
        { id: 1, name: "Droplet 1", type: "knowledge", slug: "droplet-1" },
        { id: 2, name: "Droplet 2", type: "skill", slug: "droplet-2" },
      ];

      const mockResponse = {
        data: mockDroplets.map((droplet) => ({
          id: droplet.id,
          attributes: {
            name: droplet.name,
            type: droplet.type,
            slug: droplet.slug,
          },
        })),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchDroplets();

      expect(result).toEqual(mockDroplets);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/droplets"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );
    });
    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchDroplets()).rejects.toThrow(
        "Failed to fetch droplet data.",
      );
    });
  });

  describe("fetchGroups", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return all groups", async () => {
      const mockStrapiResponse = {
        data: mockGroups.map((group) => ({
          id: group.id,
          attributes: group.attributes,
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 250,
          },
          sort: ["groupName:asc"],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchGroups();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/groups?"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];

      expect(callUrl).toMatch(/sort%5B0%5D=groupName%3Aasc/);

      expect(callUrl).toMatch(
        /fields%5B0%5D=id&fields%5B1%5D=groupName&fields%5B2%5D=slug&fields%5B3%5D=isArchived/,
      );

      expect(callUrl).toMatch(/pagination%5BpageSize%5D=250/);
      expect(callUrl).toMatch(/pagination%5Bpage%5D=1/);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            groupName: expect.any(String),
            slug: expect.any(String),
            isArchived: expect.any(Boolean),
          }),
        ]),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchGroups()).rejects.toThrow("Failed to fetch groups.");
    });

    it("should throw an error when fetch returns a non-ok response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      await expect(fetchGroups()).rejects.toThrow("Failed to fetch groups.");
    });
  });

  describe("fetchAccessRequests", () => {
    it("should fetch and return access requests", async () => {
      const mockRequests = [
        {
          id: 1,
          givenName: "John",
          familyName: "Doe",
          email: "john@northeastern.edu",
          affiliation: "Student",
          college: "KCCS",
        },
      ];

      const mockResponse = {
        data: mockRequests.map((request) => ({
          id: request.id,
          attributes: {
            givenName: request.givenName,
            familyName: request.familyName,
            email: request.email,
            affiliation: request.affiliation,
            college: request.college,
          },
        })),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      const result = await fetchAccessRequests();

      expect(result).toEqual(mockRequests);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/access-requests"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchAccessRequests()).rejects.toThrow(
        "Failed to fetch access requests data.",
      );
    });
  });

  describe("fetchReports", () => {
    it("should fetch and return reports", async () => {
      const mockReports = [
        { id: 1, name: "Report 1", type: "knowledge", slug: "report-1" },
        { id: 2, name: "Report 2", type: "skill", slug: "report-2" },
      ];

      const mockResponse = {
        data: mockReports.map((report) => ({
          id: report.id,
          attributes: {
            name: report.name,
            type: report.type,
            slug: report.slug,
          },
        })),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchReports();

      expect(result).toEqual(mockReports);
    });
    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchReports()).rejects.toThrow(
        "Failed to fetch reports data.",
      );
    });
  });
});

describe("Droplet tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDroplets", () => {
    it("should get all of the droplets", async () => {
      const mockDroplets = [
        {
          id: 1,
          name: "Droplet 1",
          type: "knowledge",
          slug: "droplet-1",
          isHidden: false,
        },
        {
          id: 2,
          name: "Droplet 2",
          type: "skill",
          slug: "droplet-2",
          isHidden: false,
        },
      ];

      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getDroplets();

      expect(result).toEqual(mockDroplets);
    });
    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch droplets"));

      await expect(getDroplets()).rejects.toThrow();
    });
  });

  describe("getDropletBySlug", () => {
    it("should find and return the droplet corresponding to the given slug", async () => {
      const mockDroplet = {
        id: 1,
        name: "Droplet 1",
        type: "knowledge",
        slug: "droplet-1",
        isHidden: false,
      };

      fetchAPI.mockResolvedValue([mockDroplet]);
      const result = await getDropletBySlug("droplet-1");

      expect(result).toEqual(mockDroplet);
      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: expect.objectContaining({
          filters: { slug: "droplet-1" },
          pagination: { pageSize: 1, page: 1 },
        }),
      });
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch droplets"));

      await expect(getDropletBySlug("invalid")).rejects.toThrow();
    });
  });

  describe("getDropletById", () => {
    it("should get a droplet based on a given ID", async () => {
      const mockDroplet = {
        id: 1,
        name: "Droplet 1",
        type: "knowledge",
        slug: "droplet-1",
        isHidden: false,
      };

      fetchAPI.mockResolvedValue(mockDroplet);

      const result = await getDropletById(1);

      expect(result).toEqual(mockDroplet);
      expect(fetchAPI).toHaveBeenCalledWith("/droplets/1", expect.any(Object));
    });
    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch droplets"));

      await expect(getDropletById(100)).rejects.toThrow();
    });
  });

  describe("getDraftDroplets", () => {
    it("should return all of the draft droplets", async () => {
      const mockDroplets = [
        {
          id: 1,
          name: "Droplet 1",
          type: "knowledge",
          slug: "droplet-1",
          status: "draft",
          isHidden: false,
        },
        {
          id: 2,
          name: "Droplet 2",
          type: "skill",
          slug: "droplet-2",
          status: "draft",
          isHidden: false,
        },
      ];

      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getDraftDroplets();

      expect(result).toEqual(mockDroplets);
    });
    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch droplets"));

      await expect(getDraftDroplets()).rejects.toThrow();
    });
  });
});

describe("getLessonBySlug", () => {
  it("should return the lesson corresponding to the given slug", async () => {
    const mockLesson = [
      {
        id: 1,
        name: "Lesson 1",
        slug: "lesson-1",
      },
    ];

    fetchAPI.mockResolvedValue([mockLesson]);

    const result = await getLessonBySlug("lesson-1");

    expect(result).toEqual(mockLesson);
  });

  it("should handle fetch errors", async () => {
    fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch lesson info"));

    await expect(getLessonBySlug("fail")).rejects.toThrow();
  });
});

describe("Playlist enrollment tests", () => {
  describe("togglePlaylistEnrollment", () => {
    it("should toggle the current user's enrollment in the playlist", async () => {
      getCurrentUser.mockResolvedValueOnce({
        name: "Harry",
        email: "hmerzin@northeastern.edu",
      });

      getAuthorizedUserByEmail.mockResolvedValueOnce({
        id: 12,
        email: "hmerzin@northeastern.edu",
        playlists: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            id: 12,
            attributes: {
              playlists: {
                data: [{ id: 1 }, { id: 3 }],
              },
            },
          },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await togglePlaylistEnrollment(2);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/12"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              playlists: {
                disconnect: [2],
              },
            },
          }),
        }),
      );

      expect(result).toEqual({ success: true });
    });

    it("should enroll user in playlist when not already enrolled", async () => {
      getCurrentUser.mockResolvedValueOnce({
        id: 12,
        name: "Harry",
        email: "hmerzin@northeastern.edu",
      });

      getAuthorizedUserByEmail.mockResolvedValueOnce({
        id: 12,
        email: "hmerzin@northeastern.edu",
        playlists: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            id: 12,
            attributes: {
              playlists: {
                data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
              },
            },
          },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await togglePlaylistEnrollment(4);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/12"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              playlists: {
                connect: [4],
              },
            },
          }),
        }),
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw the correct error when an API error occurs", async () => {
      getCurrentUser.mockResolvedValueOnce({
        name: "Harry",
        email: "hmerzin@northeastern.edu",
      });

      getAuthorizedUserByEmail.mockResolvedValueOnce({
        id: 12,
        email: "hmerzin@northeastern.edu",
        playlists: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      global.fetch.mockResolvedValueOnce(new Error("API error"));

      const result = await togglePlaylistEnrollment(2);

      expect(result).toEqual({
        success: false,
        error: "Failed to update enrollment",
      });
    });

    it("should throw an error when the user is not authenticated", async () => {
      getCurrentUser.mockResolvedValueOnce(undefined);

      getAuthorizedUserByEmail.mockResolvedValueOnce({
        id: 12,
        email: "hmerzin@northeastern.edu",
        playlists: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      const result = await togglePlaylistEnrollment(2);

      expect(result).toEqual({
        success: false,
        error: "Failed to update enrollment",
      });
    });
  });

  describe("enrollInPlaylist", () => {
    it("should enroll the user in the specified playlist", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            attributes: {
              playlists: {
                data: [{ id: 1 }, { id: 3 }, { id: 4 }],
              },
            },
          },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await enrollInPlaylist(4, 1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/1"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              playlists: {
                connect: [4],
              },
            },
          }),
        }),
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw the correct error when an API error occurs", async () => {
      global.fetch.mockResolvedValueOnce(new Error("API error"));

      const result = await enrollInPlaylist(2, 1);

      expect(result).toEqual({
        success: false,
        error: "Failed to enroll in playlist",
      });
    });

    it("should handle non-ok response from the API", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const result = await enrollInPlaylist(4, 1);

      expect(result).toEqual({
        success: false,
        error: "Failed to enroll in playlist",
      });
    });
  });
});

describe("Playlist tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPlaylistById", () => {
    it("should return the playlist corresponding to a given id", async () => {
      const mockPlaylist = {
        id: 1,
        attributes: {
          name: "Test Playlist",
          slug: "test-playlist",
          isPublic: true,
          droplets: [],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 1,
              attributes: {
                name: "Test Playlist",
                slug: "test-playlist",
                isPublic: true,
                droplets: [],
              },
            },
          }),
      });

      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce({
        data: mockPlaylist,
      });

      const result = await getPlaylistById(1);

      expect(result).toEqual(mockPlaylist);
    });

    it("should handle fetch errors", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Failed to fetch playlist by id."));
      await expect(getPlaylistById(1)).rejects.toThrow(
        "Failed to fetch playlist by id.",
      );
    });
  });

  describe("getPlaylistBySlug", () => {
    it("should return the playlist corresponding to a given slug", async () => {
      const mockPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
      };

      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce([mockPlaylist]);

      const result = await getPlaylistBySlug("test-playlist", {
        populate: "*",
        fields: ["*"],
      });

      expect(result).toEqual(mockPlaylist);
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(
        new Error("Failed to fetch playlist by id."),
      );

      await expect(getPlaylistBySlug("invalid-slug")).rejects.toThrow(
        "Failed to fetch playlist by id.",
      );
    });
  });

  describe("getPlaylists", () => {
    it("should find and return all playlists", async () => {
      const mockPlaylists = [
        {
          id: 1,
          name: "Playlist 1",
          slug: "playlist-1",
          isPublic: true,
          droplets: [],
        },
        {
          id: 2,
          name: "Playlist 2",
          slug: "playlist-2",
          isPublic: true,
          droplets: [],
        },
      ];

      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce(mockPlaylists);
      const result = await getPlaylists({
        populate: {
          droplets: true,
        },
      });

      expect(result).toEqual(mockPlaylists);
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch playlists"));

      await expect(getPlaylists()).rejects.toThrow();
    });
  });
});

describe("Tag tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTags", () => {
    it("should return all of the tags", async () => {
      const mockTags = [
        { id: 1, name: "JavaScript", slug: "javascript" },
        { id: 2, name: "React", slug: "react" },
      ];

      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce(mockTags);

      const result = await getTags();

      expect(result).toEqual(mockTags);
    });
    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch tags"));

      await expect(getTags()).rejects.toThrow();
    });
  });

  describe("getTagBySlug", () => {
    it("should find and return the tag corresponding to the given slug", async () => {
      const mockTag = { id: 1, name: "JavaScript", slug: "javascript" };

      fetchAPI.mockResolvedValue([mockTag]);
      const result = await getTagBySlug("javascript");

      expect(result).toEqual(mockTag);
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch tags"));

      await expect(getTagBySlug("invalid")).rejects.toThrow();
    });
  });

  describe("getDropletBySlug", () => {
    it("returns first droplet from results", async () => {
      const mockDroplet = { id: 1, name: "JavaScript", slug: "javascript" };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [mockDroplet] }),
      });

      const result = await getDropletBySlug("test-slug", {});
      expect(result).toEqual(mockDroplet);
    });
  });
});
