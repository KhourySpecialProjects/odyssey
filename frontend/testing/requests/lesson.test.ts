import { addLesson, completeLesson, deleteLesson, markLessonAsComplete } from "@/lib/requests/lesson";
import { revalidatePath } from "next/cache";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe("markLessonAsComplete", () => {
  beforeEach(() => {
    (revalidatePath as jest.Mock).mockImplementation(() => {});
  });

  it("successfully marks a lesson as complete", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
            viewedLessons: {
              connect: [3],
            },
          },
        }),
      }),
    );
    expect(result).toBe(true);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("handles errors when marking a lesson as complete", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to update" }),
    });

    const result = await markLessonAsComplete("enrollment-1", [1, 2], 3);
    expect(result).toBe(false);
  });
});

describe("completeLesson", () => {
  it("successfully completes a lesson", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });
    (revalidatePath as jest.Mock).mockImplementation(() => {});

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
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await completeLesson(1, [1, 2, 3]);

    expect(result).toEqual({
      success: false,
      error: expect.any(Error),
    });
  });
});

describe("deleteLesson", () => {
  it("handles lesson deletion failure", async () => {
    const mockResponse = {
      ok: false,
      json: () =>
        Promise.resolve({ error: { message: "Failed to delete" } }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await deleteLesson(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Lesson.",
    });
  });
});

describe("addLesson", () => {
  it("successfully adds a lesson", async () => {
    const mockData = {
      name: "Test Lesson",
      dropletId: 1,
      orderIndex: 1,
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await addLesson(mockData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/lessons"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Test Lesson"),
      }),
    );
    expect(result).toEqual({ ok: true, error: null, data: {} });
  });
});