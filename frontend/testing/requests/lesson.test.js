import {
  addLesson,
  completeLesson,
  deleteLesson,
  markLessonAsComplete,
  getLessonBySlug,
  updateLesson,
  revalidateLesson,
} from "@/lib/requests/lesson";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDropletById } from "@/lib/requests/droplet";

global.fetch = jest.fn();

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletById: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("markLessonAsComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("successfully marks a lesson as complete", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/api/enrollments/enrollment-1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          data: {
            viewedLessons: [1, 2, 3],
          },
        }),
      }),
    );
    expect(result).toBe(true);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("handles errors when marking a lesson as complete", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to update" }),
    });

    const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);
    expect(result).toBe(false);
  });
});

describe("completeLesson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });
  it("successfully completes a lesson", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });
    revalidatePath.mockImplementation(() => {});

    const result = await completeLesson(1, [1, 2, 3]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/api/authorized-user-activities/1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          data: {
            lessons: [1, 2, 3],
          },
        }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it("handles errors when completing a lesson", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await completeLesson(1, [1, 2, 3]);

    expect(result).toEqual({
      success: false,
      error: expect.any(Error),
    });
  });
});

describe("deleteLesson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });
  it("handles lesson deletion failure", async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: { message: "Failed to delete" } }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await deleteLesson(123);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete",
      data: null,
    });
  });
});

describe("Lesson API Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
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
        cache: "no-store",
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
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/enrollments/enrollment-1"),
        expect.objectContaining({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          },
          cache: "no-store",
          body: JSON.stringify({
            data: {
              viewedLessons: [1, 2, 3],
            },
          }),
        }),
      );
      expect(result).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(revalidatePath).toHaveBeenCalledWith(
        "/(droplets)/d/[slug]/[lessonSlug]",
        "page",
      );
      expect(revalidatePath).toHaveBeenCalledWith(
        "/(playlists)/p/[slug]",
        "page",
      );
    });

    it("handles errors when marking a lesson as complete", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to update" }),
      });

      const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);
      expect(result).toBe(false);
    });

    it("handles network errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);
      expect(result).toBe(false);
    });
  });

  describe("completeLesson", () => {
    it("successfully completes a lesson", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await completeLesson(1, [1, 2, 3]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/authorized-user-activities/1"),
        expect.objectContaining({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              lessons: [1, 2, 3],
            },
          }),
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it("handles errors when completing a lesson", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to complete" }),
      });

      const result = await completeLesson(1, [1, 2, 3]);
      expect(result).toEqual({ success: false, error: expect.any(Error) });
    });

    it("handles network errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await completeLesson(1, [1, 2, 3]);
      expect(result).toEqual({
        success: false,
        error: expect.any(Error),
      });
    });
  });

  describe("deleteLesson", () => {
    it("successfully deletes a lesson", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await deleteLesson(123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/api/lessons/123"),
        expect.objectContaining({
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          },
        }),
      );
      expect(result).toEqual({ ok: true, error: null, data: { id: 1 } });
      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });

    it("handles lesson deletion failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Failed to delete" } }),
      });

      const result = await deleteLesson(123);
      expect(result).toEqual({
        ok: false,
        error: "Failed to delete",
        data: null,
      });
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

  describe("updateLesson", () => {
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
    });

    it("handles network errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateLesson(123, { name: "Test" });
      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to update droplet.",
        data: null,
      });
    });

    it("revalidates paths when reload option is true", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await updateLesson(123, { name: "Test" }, { reload: true });

      expect(revalidatePath).toHaveBeenCalledWith(
        "(editing)/draft/d/[slug]/[lessonSlug]",
        "page",
      );
    });

    it("revalidates droplets tag when name is updated", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await updateLesson(123, { name: "New Name" });

      expect(revalidateTag).toHaveBeenCalledWith("droplets");
    });
  });

  describe("addLesson", () => {
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
    });
  });

  describe("revalidateLesson", () => {
    it("calls revalidation functions", async () => {
      await revalidateLesson();

      expect(revalidateTag).toHaveBeenCalledWith("lesson");
      expect(revalidatePath).toHaveBeenCalledWith(
        "(editing)/draft/d/[slug]/[lessonSlug]",
        "page",
      );
    });
  });
});
