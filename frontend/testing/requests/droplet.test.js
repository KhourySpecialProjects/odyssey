import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  createDroplet,
  createNewTag,
  deepDeleteDroplet,
  getDroplets,
  getDropletBySlug,
  getDropletById,
  getDraftDroplets,
  getInReviewDroplets,
  getRandomFunFactDroplet,
  updateDropletAverageRating,
  updateDropletFunFact,
  updateDroplet,
  archiveDroplet,
} from "@/lib/requests/droplet";
import { deleteLesson, addLesson } from "@/lib/requests/lesson";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { revalidatePath, revalidateTag } from "next/cache";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/lesson", () => ({
  deleteLesson: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

beforeAll(() => {
  global.fetch = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ email: "test@example.com" });
  getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
});

describe("deepDeleteDroplet", () => {
  it("handles droplet deletion failure", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await deepDeleteDroplet(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Droplet.",
    });
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ email: "test@example.com" });
  getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
  getEnrollmentsByAuthorizedUser.mockResolvedValue([
    { id: "enrollment-1", droplet: { id: 1 } },
  ]);
});

describe("Droplet API Functions", () => {
  describe("getDroplets", () => {
    it("successfully fetches droplets with default parameters", async () => {
      const mockDroplets = [
        { id: 1, name: "Droplet 1" },
        { id: 2, name: "Droplet 2" },
      ];

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getDroplets();

      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: {
          sort: undefined,
          filters: { isHidden: false },
          populate: {
            tags: true,
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
          fields: ["*"],
          pagination: { pageSize: 100, page: 1 },
        },
      });
      expect(result).toEqual(mockDroplets);
    });

    it("successfully fetches droplets with custom parameters", async () => {
      const mockDroplets = [{ id: 1, name: "Custom Droplet" }];

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getDroplets({
        sort: ["name:asc"],
        filters: { status: "published" },
        pagination: { pageSize: 50, page: 2 },
        fields: ["id", "name"],
      });

      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: {
          sort: ["name:asc"],
          filters: { status: "published" },
          populate: {
            tags: true,
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
          fields: ["id", "name"],
          pagination: { pageSize: 50, page: 2 },
        },
      });
      expect(result).toEqual(mockDroplets);
    });
  });

  describe("getDropletBySlug", () => {
    it("returns undefined when no droplet is found", async () => {
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue([]);

      const result = await getDropletBySlug("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("getDropletById", () => {
    it("successfully fetches a droplet by ID", async () => {
      const mockDroplet = {
        id: 1,
        name: "Test Droplet",
      };

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplet);

      const result = await getDropletById(1);

      expect(fetchAPI).toHaveBeenCalledWith("/droplets/1", {
        urlParams: expect.objectContaining({
          filters: {},
          populate: { "*": true },
          fields: ["*", "isHidden"],
        }),
      });
      expect(result).toEqual(mockDroplet);
    });
  });

  describe("getDraftDroplets", () => {
    it("successfully fetches draft droplets", async () => {
      const mockDroplets = [{ id: 1, name: "Draft Droplet", status: "draft" }];

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getDraftDroplets();

      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: expect.objectContaining({
          filters: { status: "draft" },
        }),
      });
      expect(result).toEqual(mockDroplets);
    });
  });

  describe("getInReviewDroplets", () => {
    it("successfully fetches in-review droplets", async () => {
      const mockDroplets = [
        { id: 1, name: "Review Droplet", inReview: true, status: "draft" },
      ];

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getInReviewDroplets();

      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: expect.objectContaining({
          filters: { inReview: true, status: "draft" },
        }),
      });
      expect(result).toEqual(mockDroplets);
    });
  });

  describe("getRandomFunFactDroplet", () => {
    it("successfully fetches droplets with fun facts", async () => {
      const mockDroplets = [
        { id: 1, name: "Fun Droplet", funFact: "Interesting fact!" },
      ];

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue(mockDroplets);

      const result = await getRandomFunFactDroplet();

      expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
        urlParams: expect.objectContaining({
          filters: {
            isHidden: false,
            funFact: { $ne: null },
          },
          pagination: { pageSize: 1000, page: 1 },
        }),
      });
      expect(result).toEqual(mockDroplets);
    });
  });

  describe("updateDropletAverageRating", () => {
    it("clamps rating to valid range", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await updateDropletAverageRating(7.5, 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            data: {
              averageRating: 5.0,
            },
          }),
        }),
      );
    });
  });

  describe("archiveDroplet", () => {
    it("successfully archives a droplet", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const mockDroplet = { id: 1, slug: "test-droplet" };

      const result = await archiveDroplet(mockDroplet, true);

      expect(getCurrentUser).toHaveBeenCalled();
      expect(getAuthorizedUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(getEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/enrollments/enrollment-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              isArchived: true,
            },
          }),
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it("handles missing user email", async () => {
      getCurrentUser.mockResolvedValue(null);

      const mockDroplet = { id: 1, slug: "test-droplet" };

      const result = await archiveDroplet(mockDroplet, true);
      expect(result).toEqual({ success: false, error: expect.any(Error) });
    });
  });

  describe("createNewTag", () => {
    it("successfully creates a new tag", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createNewTag("Test Tag");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/tags"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            data: {
              name: "Test Tag",
              slug: "TestTag",
            },
          }),
        }),
      );
    });
  });

  describe("createDroplet", () => {
    it("successfully creates a droplet", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const dropletData = {
        name: "Test Droplet",
        focusArea: "Test Area",
        type: "test",
        tagIds: [1, 2],
        learningObjectives: ["Objective 1", "Objective 2"],
      };

      const result = await createDroplet(dropletData);

      expect(getCurrentUser).toHaveBeenCalled();
      expect(getAuthorizedUserByEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          populate: {},
        },
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/droplets"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            data: {
              name: "Test Droplet",
              slug: "random",
              focusArea: "Test Area",
              type: "test",
              tags: {
                connect: [1, 2],
              },
              authorized_users: {
                connect: [1],
              },
              learningObjectives: [
                { objective: "Objective 1" },
                { objective: "Objective 2" },
              ],
            },
          }),
        }),
      );
    });
  });
});
