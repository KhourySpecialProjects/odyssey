import { S3Client } from "@aws-sdk/client-s3";
import {
  createAccessRequest,
  createBugReport,
  uploadImage,
  deleteImage,
  setTimeZone,
} from "@/lib/actions";

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

describe("actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
  }));

  global.fetch = jest.fn();

  describe("User Management Actions", () => {
    describe("createAccessRequest", () => {
      it("successfully creates an access request", async () => {
        const mockData = {
          email: "test@northeastern.edu",
          reason: "Testing",
          givenName: "Person",
          familyName: "PersonName",
          college: "Khoury",
          affiliation: "Student",
        };

        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        await createAccessRequest(mockData);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/access-requests"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("test@northeastern.edu"),
          }),
        );
      });
    });
  });

  describe("User Settings Actions", () => {
    it("should set timezone", async () => {
      const result = await setTimeZone("America/New_York", 1);
      expect(result).toBeDefined();
    });
  });

  jest.mock("@/lib/auth/session", () => ({
    getCurrentUser: jest.fn(),
  }));

  jest.mock("@/lib/requests/authorized-user", () => ({
    getAuthorizedUserByEmail: jest.fn(),
  }));

  jest.mock("@/lib/requests/enrollment", () => ({
    getEnrollmentsByAuthorizedUser: jest.fn(),
  }));

  jest.mock("@/lib/requests/authorized-user-roles", () => ({
    getAuthorizedUserRoleIdByTitle: jest.fn(),
  }));

  global.fetch = jest.fn();

  describe("Actions", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
    });

    describe("Bug Report Actions", () => {
      it("should create bug report", async () => {
        const formData = {
          title: "Test Bug",
          description: "Test Description",
          email: "email@example.com",
          path: "/home",
          type: "bug" as "bug",
          fullName: "fullName",
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await createBugReport(formData);
        expect(result.ok).toBe(true);
      });
    });
  });
});
