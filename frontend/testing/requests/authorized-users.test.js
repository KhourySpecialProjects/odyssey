const {
  getAuthorizedUserByEmail,
  fetchAuthorizedUsers,
  fetchIsAuthorizedUser,
  fetchContentCreators,
  fetchWebsiteCreators,
  getAllAuthorizedUsers,
  createAuthorizedUser,
  updateAuthorBio,
  updateAuthorizedUser,
  updateFirstTimeStatus,
  updateGithub,
  updateLinkedin,
  updateOnboardingInfo,
  updatePhoto,
  updateUserInfo
} = require("../../lib/requests/authorized-user");
const { fetchAPI } = require("../../lib/utils");

const mockUsers = require("../mocks/authorizedUsersMock");

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

describe("Authorized User Tests", () => {
  describe("getAuthorizedUserByEmail", () => {
    it("should return an authorized user based on the given email", async () => {
      const testEmail = "palmer.gi@northeastern.edu";
      const mockUser = {
        id: 1,
        firstName: "Gillian",
        lastName: "Palmer",
        email: "palmer.gi@northeastern.edu",
      };

      fetchAPI.mockResolvedValue([mockUser]);

      const result = await getAuthorizedUserByEmail(testEmail);

      expect(result).toEqual(mockUser);
      expect(fetchAPI).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
      );
      expect(jest.mocked(fetchAPI)).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          filters: {
            email: {
              $eq: testEmail,
            },
          },
        }),
      });
    });
  });

  describe("fetchAuthorizedUsers", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return authorized users", async () => {
      const mockStrapiResponse = {
        data: mockUsers.map((user) => ({
          id: user.id,
          attributes: user.attributes,
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: mockUsers.length,
          },
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchAuthorizedUsers();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean),
          }),
        ]),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchAuthorizedUsers()).rejects.toThrow(
        "Failed to fetch authorized users data.",
      );
    });
  });

  describe("fetchIsAuthorizedUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return whether the given user is authorized", async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 1,
            attributes: {
              name: "Gillian Palmer",
              authorizedUser: {
                data: {
                  attributes: {
                    email: "palmer.gi@northeastern.edu",
                  },
                },
              },
              isEnabled: true,
              roles: {
                data: [
                  {
                    attributes: {
                      title: "User",
                    },
                  },
                ],
              },
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchIsAuthorizedUser("palmer.gi@northeastern.edu");
      expect(result).toEqual(true);
    });

    it("should return false for an unauthorized user", async () => {
      const mockStrapiResponse = {
        data: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchIsAuthorizedUser(
        "unauthorized@northeastern.edu",
      );
      expect(result).toEqual(false);
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchIsAuthorizedUser()).rejects.toThrow(
        "Failed to fetch authorized users data.",
      );
    });
  });

  describe("fetchContentCreators", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return content creators", async () => {
      const mockStrapiResponse = {
        data: mockUsers.map((user) => ({
          id: user.id,
          attributes: user.attributes,
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 100,
          },
          sort: ["lastName"],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchContentCreators();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];

      expect(callUrl).toMatch(/sort%5B0%5D=lastName/);

      expect(callUrl).toMatch(
        /filters%5Broles%5D%5Btitle%5D%5B%24eq%5D=Content%20Creator/,
      );

      //expect(callUrl).toMatch(/filters%5Bdroplets%5D%5B%24null%5D=false/);

      expect(callUrl).toMatch(/pagination%5BpageSize%5D=100/);
      expect(callUrl).toMatch(/pagination%5Bpage%5D=1/);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean),
          }),
        ]),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchContentCreators()).rejects.toThrow(
        "Failed to fetch content creators.",
      );
    });
  });

  describe("fetchWebsiteCreators", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return website creators", async () => {
      const mockStrapiResponse = {
        data: mockUsers.map((user) => ({
          id: user.id,
          attributes: user.attributes,
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 100,
          },
          sort: ["lastName"],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchWebsiteCreators();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];

      expect(callUrl).toMatch(/sort%5B0%5D=lastName/);

      expect(callUrl).toMatch(
        /filters%5Broles%5D%5Btitle%5D%5B%24eq%5D=Website%20Creator/,
      );

      expect(callUrl).toMatch(/pagination%5BpageSize%5D=100/);
      expect(callUrl).toMatch(/pagination%5Bpage%5D=1/);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean),
          }),
        ]),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchWebsiteCreators()).rejects.toThrow(
        "Failed to fetch website creators.",
      );
    });
  });

  describe("getAllAuthorizedUsers", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return all authorized users", async () => {
      const mockStrapiResponse = {
        data: mockUsers.map((user) => ({
          id: user.id,
          attributes: user.attributes,
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 100,
          },
          sort: ["lastName"],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await getAllAuthorizedUsers();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users?"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];

      expect(callUrl).toMatch(/sort%5B0%5D=lastName%3Aasc/);

      expect(callUrl).toMatch(
        /fields%5B0%5D=email&fields%5B1%5D=firstName&fields%5B2%5D=lastName/,
      );

      expect(callUrl).toMatch(/pagination%5BpageSize%5D=100/);
      expect(callUrl).toMatch(/pagination%5Bpage%5D=1/);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean),
          }),
        ]),
      );
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getAllAuthorizedUsers()).rejects.toThrow(
        "Failed to fetch authorized users:",
      );
    });
  });
});

describe("updateAuthorizedUser", () => {
  it("successfully updates an authorized user", async () => {
    const formData = new FormData();
    formData.append("id", "123");
    formData.append("isEnabled", "true");

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    await updateAuthorizedUser(formData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/authorized-users/123"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("isEnabled"),
      }),
    );
  });
});

describe("Profile Management Actions", () => {
  describe("updateAuthorBio", () => {
    it("successfully updates author bio", async () => {
      const mockResponse = { ok: true };
      fetchAPI.mockResolvedValueOnce(mockResponse);

      const result = await updateAuthorBio("New bio", 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/123"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: { bio: "New bio" },
          }),
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });
});

describe("User Profile Actions", () => {
  it("should update author bio", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updateAuthorBio("New bio", 1);
    expect(result.success).toBe(true);
  });

  it("should update linkedin", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updateLinkedin("linkedin.com/test", 1);
    expect(result.success).toBe(true);
  });

  it("should update github", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updateGithub("github.com/test", 1);
    expect(result.success).toBe(true);
  });

  it("should update photo", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updatePhoto("https://example.com/photo.jpg", 1);
    expect(result.success).toBe(true);
  });

  it("should update onboarding info", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updateOnboardingInfo("John", "Doe", "Bio", 1);
    expect(result.success).toBe(true);
  });

  it("should update user info", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    global.fetch.mockImplementation(() =>
      Promise.resolve(1),
    );

    const result = await updateUserInfo(
      "John",
      "Doe",
      "Bio",
      ["User"],
      "photo.jpg",
      1,
    );
    expect(result.success).toBe(true);
  });

  it("should update first time status", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await updateFirstTimeStatus(1);
    expect(result.success).toBe(true);
  });
});

describe("Error Handling", () => {
  it("should handle invalid email format", async () => {
    const formData = new FormData();
    formData.append("email", "invalid-email");
    formData.append("isEnabled", "true");

    global.fetch.mockImplementation(() =>
      Promise.resolve(1),
    );

    const result = await createAuthorizedUser({}, formData);
    expect(result.ok).toBe(false);
  });
});
