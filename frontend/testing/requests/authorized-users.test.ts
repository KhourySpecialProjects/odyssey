import {
  getAuthorizedUserByEmail,
  getAuthorizedUsersByEmails,
  fetchAuthorizedUsers,
  fetchAuthorizedUsersMetadata,
  fetchIsAuthorizedUser,
  fetchContentCreators,
  fetchWebsiteCreators,
  createAuthorizedUser,
  createBatchAuthorizedUsers,
  updateUserInfo,
  deleteAuthorizedUser,
} from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";
import { getAuthorizedUserRoleIdByTitle } from "@/lib/requests/authorized-user-roles";
import mockUsers from "../mocks/authorizedUsersMock";

const mockFetchAPI = fetchAPI as jest.Mock;
const mockGetRoleId = getAuthorizedUserRoleIdByTitle as jest.Mock;

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

jest.mock("../../lib/requests/authorized-user-roles", () => ({
  getAuthorizedUserRoleIdByTitle: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

global.fetch = jest.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
  process.env.STRAPI_ACCESS_TOKEN = "test-token";
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockGetRoleId.mockResolvedValue(1);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
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

      mockFetchAPI.mockResolvedValue([mockUser]);

      const result = await getAuthorizedUserByEmail(testEmail);

      expect(result).toEqual(mockUser);
      expect(fetchAPI).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          filters: expect.objectContaining({
            email: {
              $eqi: testEmail,
            },
          }),
        }),
        next: { tags: ["users"], revalidate: 900 },
      });
    });

    it("should use custom populate options", async () => {
      const testEmail = "test@northeastern.edu";
      mockFetchAPI.mockResolvedValue([{ id: 1, email: testEmail }]);

      await getAuthorizedUserByEmail(testEmail, {
        populate: { roles: { fields: ["title"] } },
      });

      expect(fetchAPI).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          populate: { roles: { fields: ["title"] } },
        }),
        next: { tags: ["users"], revalidate: 900 },
      });
    });

    it("should use custom fields", async () => {
      const testEmail = "test@northeastern.edu";
      mockFetchAPI.mockResolvedValue([{ id: 1, email: testEmail }]);

      await getAuthorizedUserByEmail(testEmail, {
        fields: ["id", "email"],
      });

      expect(fetchAPI).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          fields: ["id", "email"],
        }),
        next: { tags: ["users"], revalidate: 900 },
      });
    });

    it("should use custom filters", async () => {
      const testEmail = "test@northeastern.edu";
      mockFetchAPI.mockResolvedValue([{ id: 1, email: testEmail }]);

      await getAuthorizedUserByEmail(testEmail, {
        filters: { isEnabled: true },
      });

      expect(fetchAPI).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          filters: expect.objectContaining({
            email: { $eqi: testEmail },
            isEnabled: true,
          }),
        }),
        next: { tags: ["users"], revalidate: 900 },
      });
    });
  });

  describe("getAuthorizedUsersByEmails", () => {
    it("should return matching users for a list of emails", async () => {
      const emails = ["a@test.com", "b@test.com", "c@test.com"];
      const mockUsers = [
        { id: 1, email: "a@test.com" },
        { id: 2, email: "b@test.com" },
        { id: 3, email: "c@test.com" },
      ];
      mockFetchAPI.mockResolvedValueOnce(mockUsers);

      const result = await getAuthorizedUsersByEmails(emails);

      expect(result).toEqual(mockUsers);
      expect(fetchAPI).toHaveBeenCalledTimes(1);
    });

    it("should send $in filter with all provided emails", async () => {
      const emails = ["a@test.com", "b@test.com"];
      mockFetchAPI.mockResolvedValueOnce([]);

      await getAuthorizedUsersByEmails(emails);

      const callArgs = mockFetchAPI.mock.calls[0];
      expect(callArgs[0]).toBe("/authorized-users");
      expect(callArgs[1].urlParams.filters).toEqual({
        email: { $in: emails },
      });
    });

    it("should only request id and email fields", async () => {
      mockFetchAPI.mockResolvedValueOnce([]);

      await getAuthorizedUsersByEmails(["a@test.com"]);

      const { fields } = mockFetchAPI.mock.calls[0][1].urlParams;
      expect(fields).toEqual(["id", "email"]);
    });

    it("should use pageSize of 100", async () => {
      const emails = ["a@test.com", "b@test.com", "c@test.com"];
      mockFetchAPI.mockResolvedValueOnce([]);

      await getAuthorizedUsersByEmails(emails);

      const { pagination } = mockFetchAPI.mock.calls[0][1].urlParams;
      expect(pagination).toEqual({ pageSize: 100, page: 1 });
    });

    it("should return empty array for empty email list without calling API", async () => {
      const result = await getAuthorizedUsersByEmails([]);

      expect(result).toEqual([]);
      expect(fetchAPI).not.toHaveBeenCalled();
    });

    it("should return partial results when only some emails match", async () => {
      const emails = ["exists@test.com", "missing@test.com"];
      mockFetchAPI.mockResolvedValueOnce([{ id: 1, email: "exists@test.com" }]);

      const result = await getAuthorizedUsersByEmails(emails);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("exists@test.com");
    });

    it("should handle fetch errors", async () => {
      mockFetchAPI.mockRejectedValueOnce(new Error("API Error"));

      await expect(getAuthorizedUsersByEmails(["a@test.com"])).rejects.toThrow(
        "API Error",
      );
    });

    it("should chunk emails into batches of 100 and fetch in parallel", async () => {
      const emails = Array.from({ length: 150 }, (_, i) => `user${i}@test.com`);
      const chunk1Users = emails
        .slice(0, 100)
        .map((email, i) => ({ id: i + 1, email }));
      const chunk2Users = emails
        .slice(100)
        .map((email, i) => ({ id: i + 101, email }));

      fetchAPI
        .mockResolvedValueOnce(chunk1Users)
        .mockResolvedValueOnce(chunk2Users);

      const result = await getAuthorizedUsersByEmails(emails);

      expect(fetchAPI).toHaveBeenCalledTimes(2);
      expect(
        mockFetchAPI.mock.calls[0][1].urlParams.filters.email.$in,
      ).toHaveLength(100);
      expect(
        mockFetchAPI.mock.calls[1][1].urlParams.filters.email.$in,
      ).toHaveLength(50);
      expect(result).toHaveLength(150);
    });

    it("should not chunk when emails fit in a single page", async () => {
      const emails = Array.from({ length: 50 }, (_, i) => `user${i}@test.com`);
      mockFetchAPI.mockResolvedValueOnce(
        emails.map((email, i) => ({ id: i + 1, email })),
      );

      await getAuthorizedUsersByEmails(emails);

      expect(fetchAPI).toHaveBeenCalledTimes(1);
      expect(
        mockFetchAPI.mock.calls[0][1].urlParams.filters.email.$in,
      ).toHaveLength(50);
    });

    it("should handle exactly 100 emails in a single chunk", async () => {
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@test.com`);
      mockFetchAPI.mockResolvedValueOnce(
        emails.map((email, i) => ({ id: i + 1, email })),
      );

      await getAuthorizedUsersByEmails(emails);

      expect(fetchAPI).toHaveBeenCalledTimes(1);
    });

    it("should flatten results from multiple chunks", async () => {
      const emails = Array.from({ length: 250 }, (_, i) => `user${i}@test.com`);

      fetchAPI
        .mockResolvedValueOnce([{ id: 1, email: "user0@test.com" }])
        .mockResolvedValueOnce([{ id: 101, email: "user100@test.com" }])
        .mockResolvedValueOnce([{ id: 201, email: "user200@test.com" }]);

      const result = await getAuthorizedUsersByEmails(emails);

      expect(fetchAPI).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        { id: 1, email: "user0@test.com" },
        { id: 101, email: "user100@test.com" },
        { id: 201, email: "user200@test.com" },
      ]);
    });

    it("should reject if any chunk fails", async () => {
      const emails = Array.from({ length: 150 }, (_, i) => `user${i}@test.com`);

      fetchAPI
        .mockResolvedValueOnce([{ id: 1, email: "user0@test.com" }])
        .mockRejectedValueOnce(new Error("Chunk 2 failed"));

      await expect(getAuthorizedUsersByEmails(emails)).rejects.toThrow(
        "Chunk 2 failed",
      );
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
          next: { tags: ["users"], revalidate: 900 },
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

    it("should log error before throwing", async () => {
      const consoleError = jest.spyOn(console, "error");
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchAuthorizedUsers()).rejects.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        "Database Error:",
        expect.any(Error),
      );
    });
  });

  describe("fetchAuthorizedUsersMetadata", () => {
    it("should fetch users with metadata", async () => {
      const mockResponse = {
        data: [{ id: 1, attributes: { email: "test@test.com" } }],
        meta: {
          pagination: {
            page: 1,
            pageCount: 10,
            pageSize: 25,
            total: 250,
          },
        },
      };

      mockFetchAPI.mockResolvedValue(mockResponse);

      const result = await fetchAuthorizedUsersMetadata();

      expect(result).toEqual(mockResponse);
      expect(fetchAPI).toHaveBeenCalledWith(
        "/authorized-users",
        expect.any(Object),
      );
    });

    it("should use custom pagination", async () => {
      mockFetchAPI.mockResolvedValue({ data: [], meta: { pagination: {} } });

      await fetchAuthorizedUsersMetadata({
        pagination: { pageSize: 50, page: 2 },
      });

      expect(fetchAPI).toHaveBeenCalledWith("/authorized-users", {
        urlParams: expect.objectContaining({
          pagination: { pageSize: 50, page: 2 },
        }),
        next: { tags: ["users"], revalidate: 900 },
        flattenResponse: false,
      });
    });

    it("should handle errors", async () => {
      mockFetchAPI.mockRejectedValue(new Error("Fetch failed"));

      await expect(fetchAuthorizedUsersMetadata()).rejects.toThrow(
        "Error getting authorized users metadata",
      );
    });

    it("should log error before rejecting", async () => {
      const consoleError = jest.spyOn(console, "error");
      mockFetchAPI.mockRejectedValue(new Error("Fetch failed"));

      await expect(fetchAuthorizedUsersMetadata()).rejects.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching authorized users metadata:",
        expect.any(Error),
      );
    });
  });

  describe("fetchIsAuthorizedUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return true when user is authorized and enabled", async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 1,
            attributes: {
              email: "palmer.gi@northeastern.edu",
              isEnabled: true,
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchIsAuthorizedUser("palmer.gi@northeastern.edu");
      expect(result).toBe(true);
    });

    it("should return false when user is not enabled", async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 1,
            attributes: {
              email: "disabled@northeastern.edu",
              isEnabled: false,
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchIsAuthorizedUser("disabled@northeastern.edu");
      expect(result).toBe(false);
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
      expect(result).toBe(false);
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchIsAuthorizedUser("test@test.com")).rejects.toThrow(
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
          next: { tags: ["authors"], revalidate: 3600 },
        }),
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            email: expect.any(String),
          }),
        ]),
      );
    });

    it("should filter by Content Creator role", async () => {
      const mockStrapiResponse = {
        data: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      await fetchContentCreators();

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/Content%20Creator/);
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

    it("should fetch and return website creators in order", async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 3,
            attributes: {
              email: "chapman.w@northeastern.edu",
              firstName: "Wesley",
            },
          },
          {
            id: 1,
            attributes: {
              email: "sella.j@northeastern.edu",
              firstName: "John",
            },
          },
          {
            id: 2,
            attributes: {
              email: "palmer.gi@northeastern.edu",
              firstName: "Gillian",
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchWebsiteCreators();

      expect(result[0].email).toBe("sella.j@northeastern.edu");
      expect(result[1].email).toBe("palmer.gi@northeastern.edu");
      expect(result[2].email).toBe("chapman.w@northeastern.edu");
    });

    it("should handle users not in order list", async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 1,
            attributes: {
              email: "sella.j@northeastern.edu",
              firstName: "John",
            },
          },
          {
            id: 2,
            attributes: {
              email: "unknown@northeastern.edu",
              firstName: "Unknown",
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      const result = await fetchWebsiteCreators();

      expect(result[0].email).toBe("sella.j@northeastern.edu");
    });

    it("should handle fetch errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchWebsiteCreators()).rejects.toThrow(
        "Failed to fetch website creators.",
      );
    });
  });

  describe("createAuthorizedUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetRoleId.mockResolvedValue(1);
    });

    it("should create user with valid email", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@northeastern.edu");
      formData.append("isEnabled", "true");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(true);
      expect(result.message).toContain("newuser@northeastern.edu");
    });

    it("should return error when no email provided", async () => {
      const formData = new FormData();
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("No email provided");
    });

    it("should return error for invalid email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Not a valid email");
    });

    it("should validate email without @ symbol", async () => {
      const formData = new FormData();
      formData.append("email", "invalidemail.com");
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Not a valid email");
    });

    it("should validate email without domain", async () => {
      const formData = new FormData();
      formData.append("email", "user@");
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Not a valid email");
    });

    it("should handle API error response", async () => {
      const formData = new FormData();
      formData.append("email", "test@northeastern.edu");
      formData.append("isEnabled", "true");

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Duplicate email" } }),
      });

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Duplicate email");
    });

    it("should handle API error when response.ok is true but has error", async () => {
      const formData = new FormData();
      formData.append("email", "test@northeastern.edu");
      formData.append("isEnabled", "true");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: { message: "Validation error" } }),
      });

      const result = await createAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Validation error");
    });

    it("should handle network errors", async () => {
      const formData = new FormData();
      formData.append("email", "test@northeastern.edu");
      formData.append("isEnabled", "true");

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await createAuthorizedUser(formData);

      expect(result.error).toBe(
        "Database Error: Failed to Create Authorized User.",
      );
    });

    it("should call getAuthorizedUserRoleIdByTitle", async () => {
      const formData = new FormData();
      formData.append("email", "test@northeastern.edu");
      formData.append("isEnabled", "true");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await createAuthorizedUser(formData);

      expect(getAuthorizedUserRoleIdByTitle).toHaveBeenCalledWith("User");
    });
  });

  describe("createBatchAuthorizedUsers", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetRoleId.mockResolvedValue(1);
    });

    it("should create multiple users successfully", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const emails = ["user1@test.com", "user2@test.com", "user3@test.com"];
      const result = await createBatchAuthorizedUsers(emails);

      expect(result.ok).toBe(true);
      expect(result.data.successful).toHaveLength(3);
      expect(result.data.failed).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 1 } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Duplicate email" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 3 } }),
        });

      const emails = ["user1@test.com", "duplicate@test.com", "user3@test.com"];
      const result = await createBatchAuthorizedUsers(emails);

      expect(result.ok).toBe(true);
      expect(result.data.successful).toHaveLength(2);
      expect(result.data.failed).toHaveLength(1);
      expect(result.data.failed[0].email).toBe("duplicate@test.com");
    });

    it("should handle response with error property", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ error: { message: "Validation failed" } }),
      });

      const emails = ["user1@test.com"];
      const result = await createBatchAuthorizedUsers(emails);

      expect(result.data.failed).toHaveLength(1);
      expect(result.data.failed[0].reason).toBe("Validation failed");
    });

    it("should handle network errors in batch", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const emails = ["user1@test.com", "user2@test.com"];
      const result = await createBatchAuthorizedUsers(emails);

      expect(result.data.failed).toHaveLength(2);
      expect(result.data.failed[0].reason).toBe("Network error");
    });

    it("should handle empty email array", async () => {
      const result = await createBatchAuthorizedUsers([]);

      expect(result.ok).toBe(true);
      expect(result.data.successful).toHaveLength(0);
      expect(result.data.failed).toHaveLength(0);
    });

    it("should handle role fetch error", async () => {
      mockGetRoleId.mockRejectedValue(new Error("Role not found"));

      const result = await createBatchAuthorizedUsers(["test@test.com"]);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Database Error");
    });
  });

  describe("updateUserInfo", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should update firstName", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const result = await updateUserInfo(1, { first: "John" });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/authorized-users/1"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("firstName"),
        }),
      );
    });

    it("should update lastName", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { last: "Doe" });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.lastName).toBe("Doe");
    });

    it("should update bio", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { bio: "New bio" });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.bio).toBe("New bio");
    });

    it("should update isEnabled", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { isEnabled: false });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.isEnabled).toBe(false);
    });

    it("should update isPublic", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { isPublic: true });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.isPublic).toBe(true);
    });

    it("should update firstTime", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { firstTime: false });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.firstTime).toBe(false);
    });

    it("should update linkedin", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { linkedin: "https://linkedin.com/in/user" });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.linkedin).toBe("https://linkedin.com/in/user");
    });

    it("should update github", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { github: "https://github.com/user" });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.github).toBe("https://github.com/user");
    });

    it("should update profilePhoto via photo parameter", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { photo: "https://example.com/photo.jpg" });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.profilePhoto).toBe("https://example.com/photo.jpg");
    });

    it("should update profilePhoto directly", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, {
        profilePhoto: "https://example.com/avatar.jpg",
      });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.profilePhoto).toBe("https://example.com/avatar.jpg");
    });

    it("should update roles", async () => {
      getAuthorizedUserRoleIdByTitle
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { roles: ["Admin", "Content Creator"] });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.roles.set).toEqual([{ id: 2 }, { id: 3 }]);
    });

    it("should not include roles when roles array is empty", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { roles: [] });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.roles).toBeUndefined();
    });

    it("should handle multiple fields at once", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, {
        first: "John",
        last: "Doe",
        bio: "Developer",
        isEnabled: true,
      });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.firstName).toBe("John");
      expect(body.data.lastName).toBe("Doe");
      expect(body.data.bio).toBe("Developer");
      expect(body.data.isEnabled).toBe(true);
    });

    it("should handle null values", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await updateUserInfo(1, { bio: null, linkedin: null });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data.bio).toBe(null);
      expect(body.data.linkedin).toBe(null);
    });

    it("should handle errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateUserInfo(1, { first: "John" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should log error on failure", async () => {
      const consoleError = jest.spyOn(console, "error");
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await updateUserInfo(1, { first: "John" });

      expect(consoleError).toHaveBeenCalledWith(
        "Error updating user info:",
        expect.any(Error),
      );
    });
  });

  describe("deleteAuthorizedUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should delete user successfully", async () => {
      const formData = new FormData();
      formData.append("id", "1");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const result = await deleteAuthorizedUser(formData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/authorized-users/1"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(result).toBeUndefined();
    });

    it("should handle API error response", async () => {
      const formData = new FormData();
      formData.append("id", "1");

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "User not found" } }),
      });

      const result = await deleteAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("should handle error when response.ok but has error property", async () => {
      const formData = new FormData();
      formData.append("id", "1");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: { message: "Deletion failed" } }),
      });

      const result = await deleteAuthorizedUser(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Deletion failed");
    });

    it("should handle network errors", async () => {
      const formData = new FormData();
      formData.append("id", "1");

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await deleteAuthorizedUser(formData);

      expect(result.error).toBe(
        "Database Error: Failed to Delete Authorized User.",
      );
    });

    it("should log error on failure", async () => {
      const consoleError = jest.spyOn(console, "error");
      const formData = new FormData();
      formData.append("id", "1");

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await deleteAuthorizedUser(formData);

      expect(consoleError).toHaveBeenCalled();
    });
  });
});
