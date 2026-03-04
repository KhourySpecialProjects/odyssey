import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  createDroplet,
  createNewTag,
  deepDeleteDroplet,
  duplicateDroplet,
  getDroplets,
  getDropletBySlug,
  getDropletById,
  getDraftDroplets,
  getInReviewDroplets,
  getRandomFunFactDroplet,
  publishDraftToOriginal,
  updateDropletAverageRating,
  updateDropletFunFact,
  updateDroplet,
  archiveDroplet,
  updateDropletLearningObjective,
  favoriteDroplet,
} from "@/lib/requests/droplet";
import { deleteLesson, addLesson } from "@/lib/requests/lesson";
import { getEnrollmentByUserAndDroplet } from "@/lib/requests/enrollment";
import { revalidateTag } from "next/cache";

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
  getEnrollmentByUserAndDroplet: jest.fn(),
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
  it("successfully deletes a droplet and revalidates tags", async () => {
    const { fetchAPI } = require("@/lib/utils");
    const { deleteLesson: deleteLessonMock } = require("@/lib/requests/lesson");

    fetchAPI.mockResolvedValueOnce({
      id: 123,
      name: "Test Droplet",
      lessons: [{ id: 1 }, { id: 2 }],
      authorized_users: [{ id: 1 }],
      tags: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      learningObjectives: [],
    });
    deleteLessonMock.mockResolvedValue({ ok: true });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 123 } }),
    });

    const result = await deepDeleteDroplet(123);

    expect(result).toEqual({ ok: true, error: null, data: { id: 123 } });
    expect(revalidateTag).toHaveBeenCalledWith("authors");
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
    expect(revalidateTag).toHaveBeenCalledWith("enrollments");
  });

  it("handles droplet deletion failure", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await deepDeleteDroplet(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Droplet.",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ email: "test@example.com" });
  getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
  getEnrollmentByUserAndDroplet.mockResolvedValue({
    id: "enrollment-1",
    isComplete: false,
    isArchived: false,
  });
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
        next: { tags: ["droplets"], revalidate: 900 },
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
        next: { tags: ["droplets"], revalidate: 900 },
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
          fields: expect.arrayContaining([
            "*",
            "isHidden",
            "originalDropletId",
          ]),
        }),
        next: { tags: ["droplets"], revalidate: 900 },
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
        next: { tags: ["droplets"], revalidate: 900 },
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
        next: { tags: ["droplets"], revalidate: 900 },
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
        next: { tags: ["droplets"], revalidate: 900 },
      });
      expect(result).toEqual(mockDroplets);
    });
  });

  describe("updateDropletAverageRating", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

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
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("successfully updates average rating and revalidates enrollments", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await updateDropletAverageRating(4.2, 123);

      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
    });

    it("does not revalidate on failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await updateDropletAverageRating(4.2, 123);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("updateDropletFunFact", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("successfully updates fun fact and revalidates", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await updateDropletFunFact("A fun fact!", 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/droplets/123"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ data: { funFact: "A fun fact!" } }),
        }),
      );
      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("does not revalidate on failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await updateDropletFunFact("A fun fact!", 123);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("updateDroplet", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("successfully updates a droplet with name change and revalidates", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: 123, name: "Updated Name" } }),
      });

      const result = await updateDroplet(123, { name: "Updated Name" });

      expect(result).toEqual({
        ok: true,
        error: null,
        data: { id: 123, name: "Updated Name" },
      });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("authors");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("groups");
    });

    it("revalidates droplets when isHidden changes", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      await updateDroplet(123, { isHidden: true });

      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("authors");
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("groups");
    });

    it("revalidates with regenerateSlug option", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      await updateDroplet(
        123,
        { focusArea: "New Area" },
        { regenerateSlug: true },
      );

      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("authors");
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("groups");
    });

    it("always revalidates droplets, authors, playlists, and groups on any successful update", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      await updateDroplet(123, { focusArea: "New Area" });

      expect(revalidateTag).toHaveBeenCalledWith("authors");
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("groups");
    });

    it("does not revalidate on failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Update failed" } }),
      });

      const result = await updateDroplet(123, { name: "Bad" });

      expect(result).toEqual({
        ok: false,
        error: "Update failed",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
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
      expect(getEnrollmentByUserAndDroplet).toHaveBeenCalledWith(1, 1);
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
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("handles missing user email", async () => {
      getCurrentUser.mockResolvedValue(null);

      const mockDroplet = { id: 1, slug: "test-droplet" };

      const result = await archiveDroplet(mockDroplet, true);
      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
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
      expect(revalidateTag).toHaveBeenCalledWith("tags");
    });
  });

  describe("createDroplet", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      getCurrentUser.mockResolvedValue({ email: "test@example.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
    });

    it("successfully creates a droplet", async () => {
      // Mock getDroplets to return no duplicates
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue([]);

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
        expect.stringMatching(/\/api\/droplets$/),
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
      expect(result).toEqual({
        ok: true,
        error: null,
        data: { id: 1 },
      });
      expect(revalidateTag).toHaveBeenCalledWith("authors");
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("handles duplicate droplet name", async () => {
      // Mock getDroplets to return a duplicate
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue([
        {
          id: 2,
          name: "Test Droplet",
          slug: "test-droplet",
          status: "published",
        },
      ]);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "This attribute must be unique",
              details: {
                errors: [{ path: ["name"] }],
              },
            },
          }),
      });

      const dropletData = {
        name: "Test Droplet",
        focusArea: "Test Area",
        type: "test",
        tagIds: [1, 2],
        learningObjectives: ["Objective 1"],
      };

      const result = await createDroplet(dropletData);

      expect(result).toEqual({
        ok: false,
        error: "This attribute must be unique (name)",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles missing user email", async () => {
      getCurrentUser.mockResolvedValue(null);

      const dropletData = {
        name: "Test Droplet",
        focusArea: "Test Area",
        type: "test",
        tagIds: [1, 2],
        learningObjectives: ["Objective 1"],
      };

      const result = await createDroplet(dropletData);

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to create droplet.",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles missing author", async () => {
      getAuthorizedUserByEmail.mockResolvedValue(null);

      const dropletData = {
        name: "Test Droplet",
        focusArea: "Test Area",
        type: "test",
        tagIds: [1, 2],
        learningObjectives: ["Objective 1"],
      };

      const result = await createDroplet(dropletData);

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to create droplet.",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("updateDropletLearningObjective", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.fetch.mockReset();
      getCurrentUser.mockResolvedValue({ email: "test@example.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
    });

    it("successfully updates a learning objective and revalidates", async () => {
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce({
        id: 123,
        learningObjectives: [
          { objective: "Old objective" },
          { objective: "Keep this one" },
        ],
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      const result = await updateDropletLearningObjective(
        123,
        "Old objective",
        "New objective",
      );

      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("does not revalidate on failure", async () => {
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockReset();
      fetchAPI.mockResolvedValueOnce({
        id: 123,
        learningObjectives: [{ objective: "Old objective" }],
      });

      global.fetch.mockResolvedValueOnce({ ok: false });

      const result = await updateDropletLearningObjective(
        123,
        "Old objective",
        "New objective",
      );

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("favoriteDroplet", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.fetch.mockReset();
      getCurrentUser.mockResolvedValue({ email: "test@example.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
    });

    it("successfully favorites a droplet and revalidates", async () => {
      // Mock fetching latest droplet state
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                usersFavorited: { data: [] },
              },
            },
          }),
      });

      // Mock the PUT to update favorites
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await favoriteDroplet(
        { id: 1, slug: "test-droplet" },
        true,
      );

      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("does not revalidate on failure", async () => {
      // First fetch (get latest droplet state) fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await favoriteDroplet(
        { id: 1, slug: "test-droplet" },
        true,
      );

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});

describe("duplicateDroplet", () => {
  beforeEach(() => {
    global.fetch.mockReset();
    const { fetchAPI } = require("@/lib/utils");
    fetchAPI.mockReset();
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ email: "test@test.com" });
    getAuthorizedUserByEmail.mockResolvedValue({ id: 5 });
  });

  it("successfully duplicates a droplet", async () => {
    const { fetchAPI } = require("@/lib/utils");

    // Mock getDropletById (originalDroplet fetch via fetchAPI)
    fetchAPI.mockResolvedValueOnce({
      id: 10,
      name: "Original Droplet",
      focusArea: "Science",
      type: "standard",
      description: "A droplet",
      overview: "Overview",
      tags: [],
      authorized_users: [{ id: 5 }],
      learningObjectives: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      lessons: [],
    });

    // Mock draft check fetch (no existing drafts)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });

    // Mock droplet creation fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 99,
            attributes: { slug: "draft-new", name: "[EDIT] Original Droplet" },
          },
        }),
    });

    const result = await duplicateDroplet(10);

    expect(result.ok).toBe(true);
    expect(result.isExisting).toBe(false);
    expect(revalidateTag).toHaveBeenCalledWith("authors");
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
  });

  it("returns existing draft without revalidating", async () => {
    const { fetchAPI } = require("@/lib/utils");

    // Mock getDropletById (originalDroplet fetch via fetchAPI)
    fetchAPI.mockResolvedValueOnce({
      id: 10,
      name: "Original Droplet",
      focusArea: "Science",
      type: "standard",
      description: "A droplet",
      overview: "Overview",
      tags: [],
      authorized_users: [{ id: 5 }],
      learningObjectives: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      lessons: [],
    });

    // Mock draft check fetch — returns a draft where current user (id: 5) is authorized
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 42,
              attributes: {
                slug: "draft-existing",
                name: "[EDIT] Original Droplet",
                authorized_users: {
                  data: [{ id: 5 }],
                },
              },
            },
          ],
        }),
    });

    const result = await duplicateDroplet(10);

    expect(result.ok).toBe(true);
    expect(result.isExisting).toBe(true);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("fails when user not authenticated", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await duplicateDroplet(10);

    expect(result.ok).toBe(false);
    expect(result.isExisting).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("fails when droplet creation fails", async () => {
    const { fetchAPI } = require("@/lib/utils");

    // Mock getDropletById (originalDroplet fetch via fetchAPI)
    fetchAPI.mockResolvedValueOnce({
      id: 10,
      name: "Original Droplet",
      focusArea: "Science",
      type: "standard",
      description: "A droplet",
      overview: "Overview",
      tags: [],
      authorized_users: [{ id: 5 }],
      learningObjectives: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      lessons: [],
    });

    // Mock draft check fetch (no existing drafts)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });

    // Mock droplet creation fetch — fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: "Failed to create droplet" },
        }),
    });

    const result = await duplicateDroplet(10);

    expect(result.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("publishDraftToOriginal", () => {
  beforeEach(() => {
    global.fetch.mockReset();
    const { fetchAPI } = require("@/lib/utils");
    fetchAPI.mockReset();
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ email: "test@test.com" });
    getAuthorizedUserByEmail.mockResolvedValue({ id: 5 });
  });

  it("successfully publishes a draft to original", async () => {
    const { fetchAPI } = require("@/lib/utils");
    const { deleteLesson: deleteLessonMock } = require("@/lib/requests/lesson");

    // First fetchAPI call: getDropletById for draft droplet
    fetchAPI.mockResolvedValueOnce({
      id: 20,
      name: "[EDIT] Original Droplet",
      focusArea: "Science",
      type: "standard",
      description: "A droplet",
      overview: "Overview",
      slug: "edit-original-droplet",
      tags: [],
      authorized_users: [{ id: 5 }],
      learningObjectives: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      lessons: [],
    });

    // Second fetchAPI call: getDropletById for original droplet
    fetchAPI.mockResolvedValueOnce({
      id: 10,
      name: "Original Droplet",
      slug: "original-droplet",
      tags: [],
      authorized_users: [{ id: 5 }],
      learningObjectives: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      lessons: [],
    });

    // Fetch enrollments for the draft
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    // updateDroplet calls global.fetch internally — mock the PUT
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { id: 10, name: "Original Droplet" } }),
    });

    // deepDeleteDroplet: fetchAPI call for getDropletById inside deepDeleteDroplet
    fetchAPI.mockResolvedValueOnce({
      id: 20,
      name: "[EDIT] Original Droplet",
      lessons: [],
      authorized_users: [{ id: 5 }],
      tags: [],
      prerequisites: [],
      postrequisites: [],
      nextSteps: [],
      learningObjectives: [],
    });

    // deepDeleteDroplet: actual delete fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 20 } }),
    });

    const result = await publishDraftToOriginal(20, 10);

    expect(result.ok).toBe(true);
    // Revalidation now happens in finally block
    expect(revalidateTag).toHaveBeenCalledWith("authors");
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
    expect(revalidateTag).toHaveBeenCalledWith("lesson");
    expect(revalidateTag).toHaveBeenCalledWith("playlists");
    expect(revalidateTag).toHaveBeenCalledWith("enrollments");
  });

  it("fails when user not authenticated", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await publishDraftToOriginal(20, 10);

    expect(result.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("fails when draft droplet not found", async () => {
    const { fetchAPI } = require("@/lib/utils");

    // getDropletById returns null for the draft droplet
    fetchAPI.mockResolvedValueOnce(null);

    const result = await publishDraftToOriginal(20, 10);

    expect(result.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
