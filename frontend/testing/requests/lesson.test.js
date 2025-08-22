import {
  addLesson,
  completeLesson,
  deleteLesson,
  markLessonAsComplete,
} from "@/lib/requests/lesson";
import { revalidatePath } from "next/cache";

global.fetch = jest.fn();

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
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

// describe("addLesson", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     global.fetch = jest.fn();

//   });
// it("successfully adds a lesson", async () => {
//   const mockData = {
//     name: "Test Lesson",
//     dropletId: 1,
//     orderIndex: 1,
//   };

//   const mockResponse = {
//     ok: true,
//     json: () => Promise.resolve({ data: {} }),
//   };
//   global.fetch.mockResolvedValueOnce(mockResponse);

//   const result = await addLesson(mockData);

//   expect(global.fetch).toHaveBeenCalledWith(
//     expect.stringContaining("/api/lessons"),
//     expect.objectContaining({
//       method: "POST",
//       body: expect.stringContaining("Test Lesson"),
//     }),
//   );
//   expect(result).toEqual({ ok: true, error: null, data: {} });
// });
//});
