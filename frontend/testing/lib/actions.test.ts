import { fetchAPI } from "@/lib/utils";
import {
  updateDroplet,
  completeLesson,
  markLessonAsComplete,
  uploadImage,
  deleteImage,
  deleteNote,
  setTimeZone,
} from "@/lib/actions";
import { S3Client } from "@aws-sdk/client-s3";
import { revalidatePath, revalidateTag } from "next/cache";

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

describe("actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateDroplet", () => {
    it("should handle update failure", async () => {
      (fetchAPI as jest.Mock).mockRejectedValue(new Error("Update failed"));

      const result = await updateDroplet(1, { name: "Updated Droplet" });

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to update droplet.",
        data: null,
      });
    });
  });

  jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
  }));

  describe("Action Functions", () => {
    let mockS3Send: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      global.fetch = jest.fn();
      mockS3Send = jest.fn();
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockS3Send,
      }));
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

    describe("uploadImage", () => {
      beforeEach(() => {
        process.env.AWS_S3_BUCKET_NAME = "test-bucket";
        process.env.AWS_S3_BUCKET_URL = "https://test-bucket.s3.amazonaws.com";
        process.env.AWS_S3_BUCKET_ROOT = "test-root";
      });

      it("handles missing image in form data", async () => {
        const formData = new FormData();
        const result = await uploadImage(formData);

        expect(result).toEqual({
          ok: false,
          error: "no image",
          url: null,
        });
      });
    });

    describe("deleteImage", () => {
      beforeEach(() => {
        process.env.AWS_S3_BUCKET_NAME = "test-bucket";
      });

      it("handles deletion failure", async () => {
        mockS3Send.mockResolvedValueOnce({
          $metadata: { httpStatusCode: 500 },
        });

        const result = await deleteImage("test.jpg");
        expect(result).toEqual({ ok: false, error: "Failed to delete image" });
      });
    });

    describe("deleteNote", () => {
      it("successfully deletes a note", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
          status: 200,
        });
        (revalidatePath as jest.Mock).mockImplementation(() => {});
        (revalidateTag as jest.Mock).mockImplementation(() => {});

        const result = await deleteNote(1);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching("/api/notes/1"),
          expect.objectContaining({
            method: "DELETE",
          }),
        );
        expect(result).toEqual({
          ok: true,
          error: null,
          data: { id: 1 },
        });
        expect(revalidatePath).toHaveBeenCalled();
        expect(revalidateTag).toHaveBeenCalled();
      });

      it("handles deletion failure", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          json: () =>
            Promise.resolve({ error: { message: "Failed to delete" } }),
        });

        const result = await deleteNote(1);

        expect(result).toEqual({
          ok: false,
          error: "Failed to delete",
          data: null,
        });
      });
    });

    describe("setTimeZone", () => {
      it("successfully updates timezone", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await setTimeZone("America/New_York", 1);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching("/api/authorized-users/1"),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({
              data: {
                timeZone: "America/New_York",
              },
            }),
          }),
        );
        expect(result).toEqual({ success: true });
      });

      it("handles timezone update failure", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(
          new Error("Failed to update"),
        );

        const result = await setTimeZone("America/New_York", 1);

        expect(result).toEqual({
          success: false,
          error: expect.any(Error),
        });
      });
    });
  });
});
