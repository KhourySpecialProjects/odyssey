const {
  getEnrollmentsByAuthorizedUser,
  getEnrollmentsForGroupMembers,
  changeEnrollmentRating,
  getEnrollByID,
  calculateDropletAverageRating,
  fetchEnrollmentMetadata,
  updateEnrollmentFirstTime,
  createEnrollment,
  createEnrollmentFromEmail,
  deleteEnrollment,
  updateViewedLessons,
  recordMissingCompletion,
  updateCompletionDate,
  createEnrollmentDirect,
} = require("../../lib/requests/enrollment");

const { getCurrentUser } = require("../../lib/auth/session");
const {
  getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");
const { flattenAttributes, fetchAPI } = require("../../lib/utils");
const {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} = require("../../lib/strapi-document-id");
const { requireRole } = require("../../lib/auth/require-role");
const { getDropletAccessFresh } = require("../../lib/requests/droplet-access");
const {
  describeServerActionAuth,
  authFixtures,
} = require("../helpers/server-action-auth");
const mockEnrollments = require("../mocks/enrollmentsMock");
const { makeEmptyResponse } = require("../../lib/testing/mock-helpers");
const { CACHE_TAGS } = require("../../lib/cache-tags");

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

jest.mock("../../lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("../../lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("../../lib/requests/droplet-access", () => ({
  getDropletAccessFresh: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

global.fetch = jest.fn();

const gateAs = (over = {}) =>
  authFixtures.as({ id: 1, documentId: "docU1", ...over });

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("Enrollment Tests", () => {
  const { revalidateTag } = require("next/cache");

  describe("getEnrollmentsByAuthorizedUser", () => {
    it("should find and return the enrollments corresponding to the given authorized user", async () => {
      const mockEnrollment = {
        id: 1,
        name: "Droplet 1",
        slug: "droplet-1",
      };

      fetchAPI.mockResolvedValue(mockEnrollment);
      const result = await getEnrollmentsByAuthorizedUser(1);

      expect(result).toEqual(mockEnrollment);
      expect(fetchAPI).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({
          urlParams: expect.objectContaining({
            filters: {
              $and: [
                undefined,
                { authorizedUser: { id: { $eq: 1 } } },
                { droplet: { id: { $notNull: true } } },
              ],
            },
          }),
        }),
      );
    });

    it("should use custom filters", async () => {
      fetchAPI.mockResolvedValue([]);

      await getEnrollmentsByAuthorizedUser(1, {
        filters: { isArchived: false },
      });

      expect(fetchAPI).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({
          urlParams: expect.objectContaining({
            filters: {
              $and: [
                { isArchived: false },
                { authorizedUser: { id: { $eq: 1 } } },
                { droplet: { id: { $notNull: true } } },
              ],
            },
          }),
        }),
      );
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch enrollments"));

      await expect(getEnrollmentsByAuthorizedUser(500)).rejects.toThrow();
    });
  });

  describe("getEnrollmentsForGroupMembers", () => {
    const memberIds = [1, 2, 3];
    const dropletIds = [10, 20];

    function makeMockEnrollment(id, memberId, dropletId) {
      return {
        id: String(id),
        authorizedUser: { id: memberId },
        droplet: {
          id: dropletId,
          lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
        viewedLessons: [],
        isComplete: false,
        completionDate: undefined,
      };
    }

    it("should return enrollments from a single page", async () => {
      const mockEnrollments = [
        makeMockEnrollment(1, 1, 10),
        makeMockEnrollment(2, 2, 10),
        makeMockEnrollment(3, 3, 20),
      ];
      fetchAPI.mockResolvedValueOnce(mockEnrollments);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toEqual(mockEnrollments);
      expect(fetchAPI).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no enrollments exist", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toEqual([]);
      expect(fetchAPI).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when fetchAPI returns null", async () => {
      fetchAPI.mockResolvedValueOnce(null);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toEqual([]);
      expect(fetchAPI).toHaveBeenCalledTimes(1);
    });

    it("should paginate when first page is full (250 results)", async () => {
      const fullPage = Array.from({ length: 250 }, (_, i) =>
        makeMockEnrollment(i + 1, memberIds[i % 3], dropletIds[i % 2]),
      );
      const partialPage = [makeMockEnrollment(251, 1, 10)];

      fetchAPI
        .mockResolvedValueOnce(fullPage)
        .mockResolvedValueOnce(partialPage);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toHaveLength(251);
      expect(fetchAPI).toHaveBeenCalledTimes(2);
      expect(fetchAPI.mock.calls[0][1].urlParams.pagination.page).toBe(1);
      expect(fetchAPI.mock.calls[1][1].urlParams.pagination.page).toBe(2);
    });

    it("should stop paginating when a full page is followed by an empty page", async () => {
      const fullPage = Array.from({ length: 250 }, (_, i) =>
        makeMockEnrollment(i + 1, memberIds[i % 3], dropletIds[i % 2]),
      );
      fetchAPI.mockResolvedValueOnce(fullPage).mockResolvedValueOnce([]);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toHaveLength(250);
      expect(fetchAPI).toHaveBeenCalledTimes(2);
    });

    it("should handle three pages of results", async () => {
      const page1 = Array.from({ length: 250 }, (_, i) =>
        makeMockEnrollment(i + 1, memberIds[i % 3], dropletIds[i % 2]),
      );
      const page2 = Array.from({ length: 250 }, (_, i) =>
        makeMockEnrollment(i + 251, memberIds[i % 3], dropletIds[i % 2]),
      );
      const page3 = Array.from({ length: 50 }, (_, i) =>
        makeMockEnrollment(i + 501, memberIds[i % 3], dropletIds[i % 2]),
      );

      fetchAPI
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)
        .mockResolvedValueOnce(page3);

      const result = await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      expect(result).toHaveLength(550);
      expect(fetchAPI).toHaveBeenCalledTimes(3);
      expect(fetchAPI.mock.calls[0][1].urlParams.pagination.page).toBe(1);
      expect(fetchAPI.mock.calls[1][1].urlParams.pagination.page).toBe(2);
      expect(fetchAPI.mock.calls[2][1].urlParams.pagination.page).toBe(3);
    });

    it("should send correct $in filters for member and droplet IDs", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      const callArgs = fetchAPI.mock.calls[0];
      expect(callArgs[0]).toBe("/enrollments");

      const { filters } = callArgs[1].urlParams;
      expect(filters.$and).toEqual([
        { authorizedUser: { id: { $in: memberIds } } },
        { droplet: { id: { $in: dropletIds } } },
      ]);
    });

    it("should request authorizedUser, droplet, and viewedLessons in populate", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      await getEnrollmentsForGroupMembers(memberIds, dropletIds);

      const { populate, fields } = fetchAPI.mock.calls[0][1].urlParams;
      expect(populate.authorizedUser).toEqual({ fields: ["id"] });
      expect(populate.droplet.populate.lessons).toEqual({
        fields: ["id", "name", "slug"],
      });
      expect(populate.viewedLessons).toEqual({
        fields: ["id", "name", "slug"],
      });
      expect(fields).toContain("isComplete");
      expect(fields).toContain("completionDate");
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        getEnrollmentsForGroupMembers(memberIds, dropletIds),
      ).rejects.toThrow("API Error");
    });
  });

  describe("getEnrollByID", () => {
    it("should fetch and return enrollment by ID", async () => {
      const mockEnrollment = {
        id: "123",
        rating: 5,
      };

      fetchAPI.mockResolvedValueOnce([mockEnrollment]);

      const result = await getEnrollByID("123");

      expect(result).toEqual(mockEnrollment);
    });

    it("should handle errors and reject", async () => {
      const consoleError = jest.spyOn(console, "error");
      fetchAPI.mockRejectedValueOnce(new Error("API Error"));

      await expect(getEnrollByID("123")).rejects.toThrow("Try again");
      expect(consoleError).toHaveBeenCalledWith(
        "Error getting Enrollment from ID:",
        expect.any(Error),
      );
    });

    it("should use custom query parameters", async () => {
      fetchAPI.mockResolvedValueOnce([{ id: "123" }]);

      await getEnrollByID("123", {
        sort: ["createdAt:desc"],
        fields: ["id", "status"],
      });

      expect(fetchAPI).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({
          urlParams: expect.objectContaining({
            sort: ["createdAt:desc"],
            fields: ["id", "status"],
          }),
        }),
      );
    });
  });

  describe("changeEnrollmentRating", () => {
    const owned = (overrides = {}) => [
      { id: 24, completionDate: null, authorizedUser: { id: 1 }, ...overrides },
    ];

    it("should successfully update enrollment rating", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(owned());

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 24 } }),
      });

      const result = await changeEnrollmentRating(3, "24");

      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
      const body = JSON.parse(global.fetch.mock.calls[0][1].body).data;
      expect(body).toEqual(
        expect.objectContaining({ rating: 3, isComplete: true }),
      );
      // Rating completes the droplet, so it records when
      expect(body.completionDate).toEqual(expect.any(String));
    });

    it("PUTs to the fetched enrollment's documentId without a lookup", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(owned({ documentId: "docE24" }));
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 24 } }),
      });

      await changeEnrollmentRating(3, "24");

      expect(strapiEntryUrl).toHaveBeenCalledWith(
        "enrollments",
        { id: "24", documentId: "docE24" },
        undefined,
      );
      expect(global.fetch.mock.calls[0][0]).toContain(
        "/api/enrollments/docE24",
      );
    });

    it("keeps an existing completionDate", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(
        owned({ completionDate: "2025-01-01T00:00:00.000Z" }),
      );
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 24 } }),
      });

      await changeEnrollmentRating(3, "24");

      const body = JSON.parse(global.fetch.mock.calls[0][1].body).data;
      expect(body).toEqual({ rating: 3, isComplete: true });
    });

    it("rejects an enrollment that belongs to another user", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(owned({ authorizedUser: { id: 2 } }));

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to rate enrollment");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle user without email", async () => {
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to rate enrollment");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle API error response", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(owned());

      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await changeEnrollmentRating(3, "24");

      expect(result).toEqual({
        success: false,
        error: "Failed to rate enrollment",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValueOnce(owned());

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("calculateDropletAverageRating", () => {
    it("should calculate and return average rating", async () => {
      fetchAPI.mockResolvedValueOnce(flattenAttributes(mockEnrollments));

      const result = await calculateDropletAverageRating({ id: 456 });

      expect(result).toEqual(3);
    });

    it("should return 0 when fewer than 5 ratings", async () => {
      fetchAPI.mockResolvedValueOnce([
        { id: 1, rating: 5 },
        { id: 2, rating: 4 },
        { id: 3, rating: 3 },
      ]);

      const result = await calculateDropletAverageRating({ id: 456 });

      expect(result).toBe(0);
    });

    it("should return 0 when enrollments is null", async () => {
      fetchAPI.mockResolvedValueOnce(null);

      const result = await calculateDropletAverageRating({ id: 456 });

      expect(result).toBe(0);
    });

    it("should return 0 when there are no enrollments", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      const result = await calculateDropletAverageRating({ id: 456 });

      expect(result).toBe(0);
    });

    it("should handle null ratings in calculation", async () => {
      fetchAPI.mockResolvedValueOnce([
        { id: 1, rating: 5 },
        { id: 2, rating: null },
        { id: 3, rating: 4 },
        { id: 4, rating: 3 },
        { id: 5, rating: 2 },
      ]);

      const result = await calculateDropletAverageRating({ id: 456 });

      expect(result).toBeGreaterThan(0);
    });

    it("should handle errors and reject", async () => {
      const consoleError = jest.spyOn(console, "error");
      fetchAPI.mockRejectedValueOnce(new Error("API Error"));

      await expect(calculateDropletAverageRating({ id: 456 })).rejects.toThrow(
        "Error getting droplet average rating",
      );
      expect(consoleError).toHaveBeenCalledWith(
        "Error calculating droplet average rating:",
        expect.any(Error),
      );
    });
  });

  describe("fetchEnrollmentMetadata", () => {
    it("should fetch enrollments with metadata", async () => {
      const mockResponse = {
        data: [{ id: 1 }],
        meta: {
          pagination: {
            page: 1,
            pageCount: 10,
            pageSize: 25,
            total: 250,
          },
        },
      };

      fetchAPI.mockResolvedValue(mockResponse);

      const result = await fetchEnrollmentMetadata();

      expect(result).toEqual(mockResponse);
    });

    it("should use custom pagination", async () => {
      fetchAPI.mockResolvedValue({ data: [], meta: { pagination: {} } });

      await fetchEnrollmentMetadata({
        pagination: { pageSize: 50, page: 2 },
      });

      expect(fetchAPI).toHaveBeenCalledWith(
        "/enrollments",
        expect.objectContaining({
          urlParams: expect.objectContaining({
            pagination: { pageSize: 50, page: 2 },
          }),
        }),
      );
    });

    it("should handle errors and reject", async () => {
      const consoleError = jest.spyOn(console, "error");
      fetchAPI.mockRejectedValue(new Error("Fetch failed"));

      await expect(fetchEnrollmentMetadata()).rejects.toThrow(
        "Error getting enrollment metadata",
      );
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching enrollment metadata:",
        expect.any(Error),
      );
    });
  });

  describe("updateEnrollmentFirstTime", () => {
    it("should successfully update isFirstTime", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1, isFirstTime: false } }),
      });

      const result = await updateEnrollmentFirstTime("123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments/doc123"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              isFirstTime: false,
            },
          }),
        }),
      );
      expect(result).toBeDefined();
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("PUTs to the enrollment documentId", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      strapiEntryUrl.mockResolvedValueOnce(
        "http://strapi/api/enrollments/docE1",
      );
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await updateEnrollmentFirstTime("123");

      expect(strapiEntryUrl).toHaveBeenCalledWith("enrollments", "123");
      expect(global.fetch.mock.calls[0][0]).toBe(
        "http://strapi/api/enrollments/docE1",
      );
    });

    it("throws the same error when the enrollment cannot be resolved", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      strapiEntryUrl.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      await expect(updateEnrollmentFirstTime("123")).rejects.toThrow(
        "Failed to update enrollment",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle API error", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(updateEnrollmentFirstTime("123")).rejects.toThrow(
        "Failed to update enrollment",
      );
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle network error", async () => {
      const consoleError = jest.spyOn(console, "error");
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(updateEnrollmentFirstTime("123")).rejects.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        "Error updating enrollment:",
        expect.any(Error),
      );
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("createEnrollmentFromEmail documentIds", () => {
    it("sends documentIds for droplet, viewedLessons and authorizedUser", async () => {
      const user = { id: 1, documentId: "docU1" };
      getAuthorizedUserByEmail.mockResolvedValue(user);
      fetchAPI.mockResolvedValue([]);
      resolveDocumentId.mockImplementationOnce(async () => "docD7");
      resolveDocumentIds.mockImplementationOnce(async (_c, refs) =>
        refs.map((r) => "docL" + r),
      );
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createEnrollmentFromEmail(
        { droplet: 7, viewedLessons: [1, 2] },
        "a@b.c",
      );

      expect(resolveDocumentId).toHaveBeenCalledWith("authorized-users", user);
      expect(JSON.parse(global.fetch.mock.calls[0][1].body).data).toEqual({
        droplet: "docD7",
        viewedLessons: ["docL1", "docL2"],
        authorizedUser: "docU1",
      });
    });

    it("returns ok:false without calling Strapi when a relation is missing", async () => {
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);
      resolveDocumentId.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await createEnrollmentFromEmail(
        { droplet: 7, viewedLessons: [] },
        "a@b.c",
      );

      expect(result.ok).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("createEnrollmentFromEmail", () => {
    it("creates enrollment when not already enrolled", async () => {
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]); // No existing enrollments

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollmentFromEmail(
        { droplet: 123, viewedLessons: [] },
        "test@example.com",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments"),
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("does not create enrollment when already enrolled", async () => {
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 1, droplet: { id: 123 } }]);

      await createEnrollmentFromEmail(
        { droplet: 123, viewedLessons: [] },
        "test@example.com",
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles API error when ok is false", async () => {
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Creation failed",
              details: { errors: [{ path: ["droplet"] }] },
            },
          }),
      });

      const result = await createEnrollmentFromEmail(
        { droplet: 123, viewedLessons: [] },
        "test@example.com",
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Creation failed");
      expect(result.error).toContain("droplet");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles API error when ok is true but has error", async () => {
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation failed",
              details: { errors: [{ path: ["viewedLessons"] }] },
            },
          }),
      });

      const result = await createEnrollmentFromEmail(
        { droplet: 123, viewedLessons: [] },
        "test@example.com",
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles network errors", async () => {
      const consoleError = jest.spyOn(console, "error");
      getAuthorizedUserByEmail.mockRejectedValue(new Error("Network error"));

      const result = await createEnrollmentFromEmail(
        { droplet: 123, viewedLessons: [] },
        "test@example.com",
      );

      expect(result.error).toBe("Database Error: Failed to enroll.");
      expect(consoleError).toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("deleteEnrollment", () => {
    it("deletes enrollment when found", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 123 } }]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await deleteEnrollment({ droplet: 123 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments/doc50"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("treats an empty 204 as success (Strapi v5)", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 123 } }]);
      global.fetch.mockResolvedValueOnce(makeEmptyResponse(204));

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result).toBeUndefined();
      expect(revalidateTag).toHaveBeenCalledTimes(1);
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.enrollments(1));
    });

    it("passes the fetched enrollment through, so no lookup happens", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      const found = { id: 50, documentId: "docE50", droplet: { id: 123 } };
      fetchAPI.mockResolvedValue([found]);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await deleteEnrollment({ droplet: 123 });

      expect(strapiEntryUrl).toHaveBeenCalledWith("enrollments", found);
      expect(global.fetch.mock.calls[0][0]).toContain(
        "/api/enrollments/docE50",
      );
    });

    it("returns the database error when the enrollment cannot be resolved", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 123 } }]);
      strapiEntryUrl.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result).toEqual({ error: "Database Error: Failed to unenroll." });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("does not call API when enrollment not found", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      await deleteEnrollment({ droplet: 123 });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles unauthenticated user", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue(null);

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.error).toBe("Database Error: Failed to unenroll.");
      expect(consoleError).toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles user without email", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.error).toBe("Database Error: Failed to unenroll.");
      expect(consoleError).toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles API error when ok is false", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 123 } }]);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Delete failed",
              details: { errors: [{ path: ["id"] }] },
            },
          }),
      });

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Delete failed");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles API error when ok is true but has error", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 123 } }]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation error",
              details: { errors: [{ path: ["droplet"] }] },
            },
          }),
      });

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation error");
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("createEnrollment", () => {
    const mockDroplet = {
      id: 1,
      slug: "test-droplet",
      lessons: [{ id: 1, slug: "lesson-1" }],
    };

    beforeEach(() => {
      requireRole.mockResolvedValue(gateAs());
      getDropletAccessFresh.mockResolvedValue({
        id: 1,
        isHidden: false,
        status: "published",
        authorized_users: [],
      });
    });

    it("creates enrollment when not already enrolled", async () => {
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("sends documentIds for all relations, resolving the caller's entities by numeric id only", async () => {
      const user = { id: 1, documentId: "docU1" };
      fetchAPI.mockResolvedValue([]);
      const droplet = { ...mockDroplet, documentId: "attackerDroplet" };
      const lessons = [{ id: 1, documentId: "attackerLesson" }];
      resolveDocumentId.mockImplementation(async (_c, ref) =>
        typeof ref === "object" ? ref.documentId : `doc${ref}`,
      );
      resolveDocumentIds.mockImplementationOnce(async (_c, refs) =>
        refs.map((r) => `doc${r}`),
      );
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createEnrollment(droplet, lessons);

      // The server-fetched user keeps its documentId; the caller's entities
      // are reduced to numeric ids, so a forged documentId is never used.
      expect(resolveDocumentId).toHaveBeenCalledWith("authorized-users", user);
      expect(resolveDocumentId).toHaveBeenCalledWith("droplets", droplet.id);
      expect(resolveDocumentIds).toHaveBeenCalledWith("lessons", [1]);
      expect(JSON.parse(global.fetch.mock.calls[0][1].body).data).toEqual({
        authorizedUser: "docU1",
        droplet: `doc${droplet.id}`,
        viewedLessons: ["doc1"],
      });
    });

    it("resolves numeric-only entities to documentIds", async () => {
      fetchAPI.mockResolvedValue([]);
      resolveDocumentId
        .mockImplementationOnce(async () => "docUser")
        .mockImplementationOnce(async () => "docDroplet");
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createEnrollment(mockDroplet, []);

      const data = JSON.parse(global.fetch.mock.calls[0][1].body).data;
      expect(data.authorizedUser).toBe("docUser");
      expect(data.droplet).toBe("docDroplet");
    });

    it("returns ok:false without calling Strapi when a relation is missing", async () => {
      fetchAPI.mockResolvedValue([]);
      resolveDocumentId.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("does not create when already enrolled", async () => {
      fetchAPI.mockResolvedValue([{ id: 1, droplet: { id: 1 } }]);

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles droplet without lessons", async () => {
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const dropletNoLessons = { ...mockDroplet, lessons: null };
      await createEnrollment(dropletNoLessons, []);
    });

    it("handles unauthenticated user", async () => {
      requireRole.mockResolvedValue({ ok: false, error: "unauthenticated" });

      const result = await createEnrollment(mockDroplet, []);

      expect(result).toEqual({
        ok: false,
        error: "unauthenticated",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("refuses a hidden droplet for a non-author without calling Strapi", async () => {
      fetchAPI.mockResolvedValue([]);
      getDropletAccessFresh.mockResolvedValue({
        id: 1,
        isHidden: true,
        status: "published",
        authorized_users: [{ id: 99 }],
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result).toEqual({ ok: false, error: "forbidden", data: null });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("refuses when the droplet no longer exists", async () => {
      fetchAPI.mockResolvedValue([]);
      getDropletAccessFresh.mockResolvedValue(null);

      const result = await createEnrollment(mockDroplet, []);

      expect(result.error).toBe("forbidden");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("allows an author to enroll in their hidden droplet", async () => {
      fetchAPI.mockResolvedValue([]);
      getDropletAccessFresh.mockResolvedValue({
        id: 1,
        isHidden: true,
        status: "draft",
        authorized_users: [{ id: 1 }],
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("allows a ContentEditor to enroll in a draft droplet", async () => {
      requireRole.mockResolvedValue(gateAs({ roles: ["Content Editor"] }));
      fetchAPI.mockResolvedValue([]);
      getDropletAccessFresh.mockResolvedValue({
        id: 1,
        isHidden: false,
        status: "draft",
        authorized_users: [],
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
    });

    it("skips the visibility read when already enrolled", async () => {
      fetchAPI.mockResolvedValue([{ id: 1, droplet: { id: 1 } }]);

      await createEnrollment(mockDroplet, []);

      expect(getDropletAccessFresh).not.toHaveBeenCalled();
    });

    describeServerActionAuth("createEnrollment", {
      requireRole,
      invoke: () => createEnrollment(mockDroplet, []),
      mutations: () => [global.fetch, revalidateTag],
      denial: { kind: "role", roles: [] },
      authorized: {
        as: gateAs(),
        arrange: () => {
          fetchAPI.mockResolvedValue([]);
          getDropletAccessFresh.mockResolvedValue({
            id: 1,
            isHidden: false,
            status: "published",
            authorized_users: [],
          });
          global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: { id: 1 } }),
          });
        },
        expect: (result) => expect(result.ok).toBe(true),
      },
      expectDenied: (result, code) =>
        expect(result).toEqual({ ok: false, error: code, data: null }),
    });

    it("handles API error responses", async () => {
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Creation failed",
              details: { errors: [{ path: ["droplet"] }] },
            },
          }),
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Creation failed");
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("updateViewedLessons", () => {
    // Enrollment 123 belongs to authorized user 1; its droplet has lessons 1-4.
    const enrollment = (overrides = {}) => ({
      id: "123",
      viewedLessons: [{ id: 1 }, { id: 2 }],
      isComplete: false,
      completionDate: null,
      authorizedUser: { id: 1 },
      droplet: {
        id: 9,
        lessons: [
          { id: 1, documentId: "docL1" },
          { id: 2, documentId: "docL2" },
          { id: 3, documentId: "docL3" },
          { id: 4, documentId: "docL4" },
        ],
      },
      ...overrides,
    });
    const stored = (viewedIds, extra = {}) => ({
      ok: true,
      json: async () => ({
        data: {
          id: "123",
          isComplete: false,
          completionDate: null,
          viewedLessons: viewedIds.map((id) => ({ id })),
          ...extra,
        },
      }),
    });
    const bodyOf = (call) => JSON.parse(call[1].body).data;

    beforeEach(() => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
    });

    it("adds the lesson with a relation connect instead of rewriting the list", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch.mockResolvedValueOnce(stored([1, 2, 3]));

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result).toEqual({ success: true, alreadyViewed: false });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toContain("/api/enrollments/doc123?");
      expect(decodeURIComponent(url)).toContain(
        "populate[viewedLessons][fields][0]=id",
      );
      expect(init.method).toBe("PUT");
      expect(bodyOf(global.fetch.mock.calls[0])).toEqual({
        viewedLessons: { connect: ["docL3"] },
      });
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("uses the fetched documentIds without any lookup", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment({ documentId: "docE123" })]);
      global.fetch.mockResolvedValueOnce(stored([1, 2, 3]));

      await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(strapiEntryUrl).toHaveBeenCalledWith(
        "enrollments",
        { id: "123", documentId: "docE123" },
        expect.any(String),
      );
      expect(resolveDocumentId).toHaveBeenCalledWith("lessons", {
        id: 3,
        documentId: "docL3",
      });
    });

    it("resolves the lesson documentId when the droplet lessons lack one", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({
          droplet: { id: 9, lessons: [{ id: 3 }, { id: 4 }] },
        }),
      ]);
      resolveDocumentId.mockImplementationOnce(async () => "docResolved3");
      global.fetch.mockResolvedValueOnce(stored([1, 2, 3]));

      await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(bodyOf(global.fetch.mock.calls[0])).toEqual({
        viewedLessons: { connect: ["docResolved3"] },
      });
    });

    it("returns the failure result when the lesson cannot be resolved", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      resolveDocumentId.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result).toEqual({
        success: false,
        error: "Failed to update viewed lessons",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("judges completion on the list Strapi returns, including a concurrent save's lesson", async () => {
      // Read showed [1, 2]; while saving 4, another save stored 3.
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch
        .mockResolvedValueOnce(stored([1, 2, 3, 4]))
        .mockResolvedValueOnce(stored([1, 2, 3, 4], { isComplete: true }));

      const result = await updateViewedLessons("123", 4, [1, 2, 3, 4]);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const completion = bodyOf(global.fetch.mock.calls[1]);
      expect(completion.isComplete).toBe(true);
      expect(completion.completionDate).toEqual(expect.any(String));
    });

    it("does not mark complete while the stored list is still missing a lesson", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch.mockResolvedValueOnce(stored([1, 2, 3]));

      await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("keeps an existing completionDate when marking complete", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({ viewedLessons: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
      ]);
      global.fetch
        .mockResolvedValueOnce(
          stored([1, 2, 3, 4], { completionDate: "2025-01-01T00:00:00.000Z" }),
        )
        .mockResolvedValueOnce(stored([1, 2, 3, 4], { isComplete: true }));

      await updateViewedLessons("123", 4, [1, 2, 3, 4]);

      expect(bodyOf(global.fetch.mock.calls[1])).toEqual({ isComplete: true });
    });

    it("uses the droplet's own lesson list over the caller's", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({
          droplet: { id: 9, lessons: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        }),
      ]);
      global.fetch
        .mockResolvedValueOnce(stored([1, 2, 3]))
        .mockResolvedValueOnce(stored([1, 2, 3], { isComplete: true }));

      await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(bodyOf(global.fetch.mock.calls[1]).isComplete).toBe(true);
    });

    it("writes nothing when the lesson was already viewed and the droplet isn't complete", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({ viewedLessons: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
      ]);

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result).toEqual({ success: true, alreadyViewed: true });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("marks complete when every lesson was already viewed but completion wasn't recorded", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({
          viewedLessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        }),
      ]);
      global.fetch.mockResolvedValueOnce(
        stored([1, 2, 3, 4], { isComplete: true }),
      );

      const result = await updateViewedLessons("123", 4, [1, 2, 3, 4]);

      expect(result.alreadyViewed).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const body = bodyOf(global.fetch.mock.calls[0]);
      expect(body.isComplete).toBe(true);
      expect(body.completionDate).toEqual(expect.any(String));
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("does nothing for an enrollment that is already complete with a date", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({
          viewedLessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          isComplete: true,
          completionDate: "2025-01-01T00:00:00.000Z",
        }),
      ]);

      await updateViewedLessons("123", 4, [1, 2, 3, 4]);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("rejects an enrollment that belongs to another user", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({ authorizedUser: { id: 2 } }),
      ]);

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result.success).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update viewed lessons");
    });

    it("reports failure when the save is rejected", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result.success).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles network errors", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result.success).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("recordMissingCompletion", () => {
    const enrollment = (overrides = {}) => ({
      id: "123",
      viewedLessons: [{ id: 1 }, { id: 2 }],
      isComplete: false,
      completionDate: null,
      authorizedUser: { id: 1 },
      droplet: { id: 9, lessons: [{ id: 1 }, { id: 2 }] },
      ...overrides,
    });
    const ok = { ok: true, json: async () => ({ data: { id: "123" } }) };

    beforeEach(() => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
    });

    it("marks an all-viewed enrollment complete with a date", async () => {
      fetchAPI.mockResolvedValueOnce([enrollment()]);
      global.fetch.mockResolvedValueOnce(ok);

      const result = await recordMissingCompletion("123");

      expect(result).toEqual({ success: true, updated: true });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body).data;
      expect(body.isComplete).toBe(true);
      expect(body.completionDate).toEqual(expect.any(String));
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("adds a date to an enrollment marked complete by rating", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({ viewedLessons: [{ id: 1 }], isComplete: true }),
      ]);
      global.fetch.mockResolvedValueOnce(ok);

      const result = await recordMissingCompletion("123");

      expect(result.updated).toBe(true);
    });

    it("leaves complete-with-date and unfinished enrollments alone", async () => {
      fetchAPI
        .mockResolvedValueOnce([
          enrollment({
            isComplete: true,
            completionDate: "2025-01-01T00:00:00.000Z",
          }),
        ])
        .mockResolvedValueOnce([enrollment({ viewedLessons: [{ id: 1 }] })]);

      expect(await recordMissingCompletion("123")).toEqual({
        success: true,
        updated: false,
      });
      expect(await recordMissingCompletion("123")).toEqual({
        success: true,
        updated: false,
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects an enrollment that belongs to another user", async () => {
      fetchAPI.mockResolvedValueOnce([
        enrollment({ authorizedUser: { id: 2 } }),
      ]);

      const result = await recordMissingCompletion("123");

      expect(result).toEqual({ success: false, updated: false });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("updateCompletionDate", () => {
    it("should successfully set completion date", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@test.com",
      });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const result = await updateCompletionDate("123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments/doc123"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("completionDate"),
        }),
      );
      expect(result.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("PUTs via the enrollment documentId and fails cleanly when missing", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      strapiEntryUrl.mockResolvedValueOnce(
        "http://strapi/api/enrollments/docE1",
      );
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await updateCompletionDate("123");

      expect(strapiEntryUrl).toHaveBeenCalledWith("enrollments", "123");
      expect(global.fetch.mock.calls[0][0]).toBe(
        "http://strapi/api/enrollments/docE1",
      );

      global.fetch.mockClear();
      strapiEntryUrl.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await updateCompletionDate("123");

      expect(result).toEqual({
        success: false,
        error: "Failed to add completion date",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to add completion date");
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle user without email", async () => {
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle API failure", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@test.com",
      });

      global.fetch.mockResolvedValue({
        ok: false,
      });

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        "Error in adding completion date: ",
        expect.any(Error),
      );
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("createEnrollmentDirect", () => {
    it("sends documentIds for the user and droplet relations", async () => {
      resolveDocumentId
        .mockImplementationOnce(async () => "docU3")
        .mockImplementationOnce(async () => "docD9");
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollmentDirect(3, 9);

      expect(resolveDocumentId).toHaveBeenCalledWith("authorized-users", 3);
      expect(resolveDocumentId).toHaveBeenCalledWith("droplets", 9);
      expect(JSON.parse(global.fetch.mock.calls[0][1].body).data).toEqual({
        authorizedUser: "docU3",
        droplet: "docD9",
        viewedLessons: [],
      });
      expect(result.ok).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-3");
    });

    it("returns ok:false without calling Strapi when a relation is missing", async () => {
      resolveDocumentId.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await createEnrollmentDirect(3, 9);

      expect(result.ok).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
