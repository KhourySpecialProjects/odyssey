const {
  getEnrollmentsByAuthorizedUser,
  getIsEnrolled,
  getIsEnrollComplete,
  changeEnrollmentRating,
  getEnrollByID,
  calculateDropletAverageRating,
  fetchEnrollmentMetadata,
  updateEnrollmentFirstTime,
  createEnrollment,
  createEnrollmentFromEmail,
  deleteEnrollment,
  updateViewedLessons,
  updateCompletionDate,
} = require("../../lib/requests/enrollment");

const { getCurrentUser } = require("../../lib/auth/session");
const {
  getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");
const { flattenAttributes, fetchAPI } = require("../../lib/utils");
const mockEnrollments = require("../mocks/enrollmentsMock");

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

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("Enrollment Tests", () => {
  const { revalidatePath, revalidateTag } = require("next/cache");

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
              $and: [undefined, { authorizedUser: { id: { $eq: 1 } } }],
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

  describe("getIsEnrolled", () => {
    it("should return true when user is enrolled", async () => {
      const mockEnrollment = [
        {
          id: 1,
          name: "Droplet 1",
          slug: "droplet-1",
        },
      ];

      fetchAPI.mockResolvedValue(mockEnrollment);

      const result = await getIsEnrolled(1, 1);

      expect(result).toBe(true);
    });

    it("should return false when user is not enrolled", async () => {
      fetchAPI.mockResolvedValue([]);

      const result = await getIsEnrolled(1, 1);

      expect(result).toBe(false);
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(
        new Error("Failed to fetch enrollment info"),
      );

      await expect(getIsEnrolled(1, 1)).rejects.toThrow();
    });
  });

  describe("getIsEnrollComplete", () => {
    it("should return true when enrollment is complete", async () => {
      const mockEnrollment = [
        {
          id: 1,
          isComplete: true,
        },
      ];

      fetchAPI.mockResolvedValue(mockEnrollment);

      const result = await getIsEnrollComplete(5, 3);

      expect(result).toBe(true);
    });

    it("should return false when enrollment is not complete", async () => {
      const mockEnrollment = [
        {
          id: 1,
          isComplete: false,
        },
      ];

      fetchAPI.mockResolvedValue(mockEnrollment);

      const result = await getIsEnrollComplete(5, 3);

      expect(result).toBe(false);
    });

    it("should return false when no enrollment exists", async () => {
      fetchAPI.mockResolvedValue([]);

      const result = await getIsEnrollComplete(1, 1);

      expect(result).toBe(false);
    });

    it("should return false when isComplete is undefined", async () => {
      fetchAPI.mockResolvedValue([{ id: 1 }]);

      const result = await getIsEnrollComplete(1, 1);

      expect(result).toBe(false);
    });

    it("should handle fetch errors and return false", async () => {
      const consoleError = jest.spyOn(console, "error");
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch"));

      const result = await getIsEnrollComplete(1, 1);

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching enrollment status: ",
        expect.any(Error),
      );
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
    it("should successfully update enrollment rating", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 24 } }),
      });

      const result = await changeEnrollmentRating(3, "24");

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith("/p/[slug]", "page");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "page");
    });

    it("should handle unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to rate enrollment");
    });

    it("should handle user without email", async () => {
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to rate enrollment");
    });

    it("should handle API error response", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await changeEnrollmentRating(3, "24");

      expect(result).toEqual({
        success: false,
        error: "Failed to rate enrollment",
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@northeastern.edu",
      });

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await changeEnrollmentRating(3, "24");

      expect(result.success).toBe(false);
      expect(revalidatePath).not.toHaveBeenCalled();
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
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1, isFirstTime: false } }),
      });

      const result = await updateEnrollmentFirstTime("123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments/123"),
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
    });

    it("should handle API error", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(updateEnrollmentFirstTime("123")).rejects.toThrow(
        "Failed to update enrollment",
      );
    });

    it("should handle network error", async () => {
      const consoleError = jest.spyOn(console, "error");
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(updateEnrollmentFirstTime("123")).rejects.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        "Error updating enrollment:",
        expect.any(Error),
      );
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
        expect.stringContaining("/api/enrollments/50"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
    });

    it("does not call API when enrollment not found", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 50, droplet: { id: 999 } }]);

      await deleteEnrollment({ droplet: 123 });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles unauthenticated user", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue(null);

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.error).toBe("Database Error: Failed to unenroll.");
      expect(consoleError).toHaveBeenCalled();
    });

    it("handles user without email", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await deleteEnrollment({ droplet: 123 });

      expect(result.error).toBe("Database Error: Failed to unenroll.");
      expect(consoleError).toHaveBeenCalled();
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
    });
  });

  describe("createEnrollment", () => {
    const mockDroplet = {
      id: 1,
      slug: "test-droplet",
      lessons: [{ id: 1, slug: "lesson-1" }],
    };

    it("creates enrollment when not already enrolled", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
    });

    it("does not create when already enrolled", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([{ id: 1, droplet: { id: 1 } }]);

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("revalidates droplet-specific paths when lessons exist", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createEnrollment(mockDroplet, []);

      expect(revalidatePath).toHaveBeenCalledWith(
        "/(droplets)/d/test-droplet",
        "page",
      );
      expect(revalidatePath).toHaveBeenCalledWith(
        "/(droplets)/d/test-droplet/lesson-1",
        "page",
      );
    });

    it("handles droplet without lessons", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
      fetchAPI.mockResolvedValue([]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const dropletNoLessons = { ...mockDroplet, lessons: null };
      await createEnrollment(dropletNoLessons, []);

      expect(revalidatePath).toHaveBeenCalledWith(
        "/(droplets)/d/test-droplet",
        "page",
      );
    });

    it("handles unauthenticated user", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue(null);

      const result = await createEnrollment(mockDroplet, []);

      expect(result.error).toBe("Database Error: Failed to enroll.");
      expect(consoleError).toHaveBeenCalled();
    });

    it("handles API error responses", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
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

      const result = await createEnrollment(mockDroplet, []);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Creation failed");
    });
  });

  describe("updateViewedLessons", () => {
    it("adds lesson when not already viewed", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockResolvedValueOnce([
        {
          id: "123",
          viewedLessons: [{ id: 1 }, { id: 2 }],
          isComplete: false,
        },
      ]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const result = await updateViewedLessons("123", 3, [1, 2, 3, 4]);

      expect(result.success).toBe(true);
      expect(result.alreadyViewed).toBe(false);
    });

    it("does not update when lesson already viewed", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockResolvedValueOnce([
        {
          id: "123",
          viewedLessons: [{ id: 1 }, { id: 2 }, { id: 3 }],
          isComplete: false,
        },
      ]);

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const result = await updateViewedLessons("123", 3, [1, 2, 3]);

      expect(result.alreadyViewed).toBe(true);
      expect(result.success).toBe(true);
    });

    it("marks complete when all lessons viewed", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockResolvedValueOnce([
        {
          id: "123",
          viewedLessons: [{ id: 1 }, { id: 2 }],
          isComplete: false,
        },
      ]);

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

      await updateViewedLessons("123", 3, [1, 2, 3]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not mark complete when already complete", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockResolvedValueOnce([
        {
          id: "123",
          viewedLessons: [{ id: 1 }, { id: 2 }],
          isComplete: true,
        },
      ]);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await updateViewedLessons("123", 3, [1, 2, 3]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("handles unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await updateViewedLessons("123", 3, [1, 2, 3]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update viewed lessons");
    });

    it("handles API error", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockResolvedValueOnce([
        {
          id: "123",
          viewedLessons: [],
          isComplete: false,
        },
      ]);

      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await updateViewedLessons("123", 1, [1, 2]);

      expect(result.success).toBe(false);
    });

    it("handles network errors", async () => {
      const consoleError = jest.spyOn(console, "error");
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      fetchAPI.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateViewedLessons("123", 1, [1, 2]);

      expect(result.success).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        "Error updating viewed lessons:",
        expect.any(Error),
      );
    });
  });

  describe("updateCompletionDate", () => {
    it("should successfully set completion date", async () => {
      getCurrentUser.mockResolvedValue({
        email: "test@test.com",
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const result = await updateCompletionDate("123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments/123"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("completionDate"),
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should handle unauthenticated user", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to add completion date");
    });

    it("should handle user without email", async () => {
      getCurrentUser.mockResolvedValue({ name: "Test" });

      const result = await updateCompletionDate("123");

      expect(result.success).toBe(false);
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
    });
  });
});
