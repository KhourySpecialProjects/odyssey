import {
  addLesson,
  completeLesson,
  deleteLesson,
  markLessonAsComplete,
  getLessonBySlug,
  updateLesson,
  revalidateLesson,
  duplicateLessonToDroplet,
} from "@/lib/requests/lesson";
import { revalidateTag } from "next/cache";

global.fetch = jest.fn();

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  stripHtmlTags: jest.fn((str) => str),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

describe("Lesson API Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe("addLesson", () => {
    it("successfully creates a lesson and revalidates enrollment caches", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 1,
              attributes: {
                name: "Test Lesson",
                slug: "test-lesson",
              },
            },
          }),
      });

      const result = await addLesson({
        name: "Test Lesson",
        dropletId: 1,
        orderIndex: 0,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/lessons"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            data: {
              name: "Test Lesson",
              slug: "random",
              blocks: [],
              droplets: {
                connect: [1],
              },
              orderIndex: 0,
            },
          }),
        }),
      );
      expect(result).toEqual({
        ok: true,
        error: null,
        data: expect.objectContaining({ id: 1 }),
      });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
    });

    it("creates lesson with blocksV2", async () => {
      const mockBlocks = [
        {
          id: "test-id",
          type: "heading",
          props: { level: 1 },
          content: [{ text: "Test", type: "text", styles: {} }],
          children: [],
        },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 1,
              attributes: {
                name: "Test Lesson",
                slug: "test-lesson",
              },
            },
          }),
      });

      const result = await addLesson({
        name: "Test Lesson",
        dropletId: 1,
        orderIndex: 0,
        blocksV2: mockBlocks,
        blocksVersion: "v2",
      });

      // Check that fetch was called
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Parse the actual body that was sent
      const callArgs = global.fetch.mock.calls[0];
      const actualBody = JSON.parse(callArgs[1].body);

      // Check the structure instead of exact match
      expect(actualBody.data).toMatchObject({
        name: "Test Lesson",
        slug: "random",
        blocks: [],
        blocksV2: mockBlocks,
        blocksVersion: "v2",
        droplets: {
          connect: [1],
        },
        orderIndex: 0,
      });

      expect(result.ok).toBe(true);
    });

    it("defaults to v2 when blocksV2 provided without version", async () => {
      const mockBlocks = [
        { id: "1", type: "paragraph", props: {}, children: [] },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await addLesson({
        name: "Test",
        dropletId: 1,
        orderIndex: 0,
        blocksV2: mockBlocks,
      });

      const callArgs = global.fetch.mock.calls[0];
      const actualBody = JSON.parse(callArgs[1].body);

      expect(actualBody.data.blocksVersion).toBe("v2");
      expect(actualBody.data.blocksV2).toEqual(mockBlocks);
    });

    it("creates lesson with empty blocks array when no blocksV2", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await addLesson({
        name: "Test",
        dropletId: 1,
        orderIndex: 0,
      });

      const callArgs = global.fetch.mock.calls[0];
      const actualBody = JSON.parse(callArgs[1].body);

      expect(actualBody.data.blocks).toEqual([]);
      expect(actualBody.data).not.toHaveProperty("blocksV2");
    });

    it("defaults to v2 when blocksV2 provided without version", async () => {
      const mockBlocks = [
        { id: "1", type: "paragraph", props: {}, children: [] },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await addLesson({
        name: "Test",
        dropletId: 1,
        orderIndex: 0,
        blocksV2: mockBlocks,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"blocksVersion":"v2"'),
        }),
      );
    });

    it("handles lesson creation failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Creation failed" } }),
      });

      const result = await addLesson({
        name: "Test Lesson",
        dropletId: 1,
        orderIndex: 1,
      });

      expect(result).toEqual({
        ok: false,
        error: "Creation failed",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("handles network errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await addLesson({
        name: "Test Lesson",
        dropletId: 1,
        orderIndex: 1,
      });

      expect(result).toEqual({
        error: "Database Error: Failed to create lesson.",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("creates lesson with empty blocks array when no blocksV2", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await addLesson({
        name: "Test",
        dropletId: 1,
        orderIndex: 0,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"blocks":[]'),
        }),
      );
    });
  });

  describe("updateLesson", () => {
    it("successfully updates lesson with blocksV2", async () => {
      const mockBlocks = [
        { id: "1", type: "heading", props: {}, children: [] },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      const result = await updateLesson(123, {
        name: "Updated",
        blocksV2: mockBlocks,
        blocksVersion: "v2",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/lessons/123"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"blocksVersion":"v2"'),
        }),
      );
      expect(result.ok).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("lesson");
    });

    it("strips IDs from blocks when updating", async () => {
      const blocksWithIds = [
        {
          id: "block-1",
          type: "paragraph",
          content: "test",
        },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      await updateLesson(123, { blocks: blocksWithIds });

      const callBody = JSON.parse(
        global.fetch.mock.calls[0][1].body, // Remove 'as jest.Mock'
      );
      expect(callBody.data.blocks[0]).not.toHaveProperty("id");
    });

    it("handles update failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation failed",
              details: { errors: [{ path: ["name"] }] },
            },
          }),
      });

      const result = await updateLesson(123, { name: "Invalid Name" });
      expect(result).toEqual({
        ok: false,
        error: "Validation failed (name)",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("revalidates paths when reload option is true", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await updateLesson(123, { name: "Test" }, { reload: true });

      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("lesson");
    });

    it("supports regenerateSlug option", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 123 } }),
      });

      await updateLesson(123, { name: "New Name" }, { regenerateSlug: true });

      const callBody = JSON.parse(
        global.fetch.mock.calls[0][1].body, // Remove 'as jest.Mock'
      );
      expect(callBody.data.regenerateSlug).toBe(true);
    });
  });

  describe("getLessonBySlug", () => {
    it("successfully fetches a lesson by slug", async () => {
      const mockLesson = {
        id: 1,
        name: "Test Lesson",
        slug: "test-lesson",
        blocks: [],
      };

      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue([mockLesson]);

      const result = await getLessonBySlug("test-lesson");

      expect(fetchAPI).toHaveBeenCalledWith("/lessons", {
        urlParams: expect.objectContaining({
          filters: { slug: "test-lesson" },
          populate: {
            blocks: {
              populate: {
                questions: {
                  populate: ["answerOptions"],
                },
              },
            },
          },
        }),
        next: { tags: ["droplets", "lesson"], revalidate: 900 },
      });
      expect(result).toEqual(mockLesson);
    });

    it("returns undefined when no lesson is found", async () => {
      const { fetchAPI } = require("@/lib/utils");
      fetchAPI.mockResolvedValue([]);

      const result = await getLessonBySlug("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("markLessonAsComplete", () => {
    it("successfully marks a lesson as complete", async () => {
      const { getCurrentUser } = require("@/lib/auth/session");
      const {
        getAuthorizedUserByEmail,
      } = require("@/lib/requests/authorized-user");
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);

      expect(result).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("handles errors when marking as complete", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);
      expect(result).toBe(false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("completeLesson", () => {
    it("successfully completes a lesson", async () => {
      const { getCurrentUser } = require("@/lib/auth/session");
      const {
        getAuthorizedUserByEmail,
      } = require("@/lib/requests/authorized-user");
      getCurrentUser.mockResolvedValue({ email: "test@test.com" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await completeLesson(1, [1, 2, 3]);
      expect(result).toEqual({ success: true });
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-1");
    });

    it("handles errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await completeLesson(1, [1, 2, 3]);
      expect(result).toEqual({
        success: false,
        error: expect.any(Error),
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("deleteLesson", () => {
    it("successfully deletes a lesson", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await deleteLesson(123);
      expect(result).toEqual({ ok: true, error: null, data: { id: 1 } });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("skips revalidation when revalidate is false", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await deleteLesson(123, false);
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("revalidateLesson", () => {
    it("calls revalidation functions", async () => {
      await revalidateLesson();

      expect(revalidateTag).toHaveBeenCalledWith("lesson");
    });
  });

  describe("duplicateLessonToDroplet", () => {
    it("duplicates v2 lesson correctly and revalidates enrollments", async () => {
      const mockV2Lesson = {
        data: {
          id: 1,
          attributes: {
            name: "Original",
            slug: "original",
            blocksVersion: "v2",
            blocksV2: [{ id: "1", type: "paragraph", props: {}, children: [] }],
            type: "general",
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockV2Lesson),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 2 } }),
        });

      const result = await duplicateLessonToDroplet(1, 2, 0);

      expect(result.ok).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/lessons"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"blocksVersion":"v2"'),
        }),
      );
    });
  });
});
