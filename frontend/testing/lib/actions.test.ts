import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  uploadImage,
  deleteImage,
  setTimeZone,
  createBugReport,
  createAccessRequest,
  deleteAccessRequest,
  deleteReport,
  createAuthorizedUserWithState,
} from "@/lib/actions";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";

global.fetch = jest.fn();

jest.mock("@/lib/requests/authorized-user", () => ({
  createAuthorizedUser: jest.fn(),
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

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const { redirect } = require("next/navigation");
const { revalidatePath } = require("next/cache");

describe("Server Actions", () => {
  let mockS3Send: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AWS_S3_BUCKET_NAME: "test-bucket",
      AWS_S3_BUCKET_URL: "https://test-bucket.s3.amazonaws.com",
      AWS_S3_BUCKET_ROOT: "test-root",
      NEXT_PUBLIC_STRAPI_API_URL: "http://localhost:1337",
      STRAPI_ACCESS_TOKEN: "test-token",
      AWS_REGION: "us-east-2",
    };

    mockS3Send = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send,
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("uploadImage", () => {
    it("returns error when no image in formData", async () => {
      const formData = new FormData();
      const result = await uploadImage(formData);

      expect(result).toEqual({
        ok: false,
        error: "no image",
        url: null,
      });
    });

    it("returns error when image size is 0", async () => {
      const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
      Object.defineProperty(emptyFile, "size", { value: 0 });
      const formData = new FormData();
      formData.set("image", emptyFile);

      const result = await uploadImage(formData);

      expect(result).toEqual({
        ok: false,
        error: "no image",
        url: null,
      });
    });

    it("handles S3 upload exception", async () => {
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.set("image", file);

      mockS3Send.mockRejectedValueOnce(new Error("S3 Error"));

      const result = await uploadImage(formData);

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to upload image.",
        url: null,
      });
    });

    it("logs error on exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.set("image", file);

      mockS3Send.mockRejectedValueOnce(new Error("S3 Error"));

      await uploadImage(formData);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("deleteImage", () => {
    it("successfully deletes image", async () => {
      mockS3Send.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 204 },
      });
    });

    it("returns error when deletion fails with non-204 status", async () => {
      mockS3Send.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 500 },
      });

      const result = await deleteImage("test.jpg");

      expect(result).toEqual({ ok: false, error: "Failed to delete image" });
    });

    it("handles S3 deletion exception", async () => {
      mockS3Send.mockRejectedValueOnce(new Error("S3 Error"));

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
        expect.stringContaining("/api/authorized-users/1"),
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

    it("handles fetch response not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await setTimeZone("America/Los_Angeles", 1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles fetch exception", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await setTimeZone("America/Chicago", 1);

      expect(result).toEqual({
        success: false,
        error: expect.any(Error),
      });
    });

    it("logs error on failure", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await setTimeZone("America/Denver", 1);

      expect(consoleError).toHaveBeenCalledWith(
        "Error updating timezone:",
        expect.any(Error),
      );
      consoleError.mockRestore();
    });
  });

  describe("createBugReport", () => {
    it("successfully creates bug report", async () => {
      const formData = {
        title: "Test Bug",
        description: "Test Description",
        email: "email@example.com",
        path: "/home",
        type: "bug" as const,
        fullName: "John Doe",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createBugReport(formData);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ data: { id: 1 } });
    });

    it("includes timestamp in request", async () => {
      const formData = {
        title: "Test Bug",
        description: "Test Description",
        email: "email@example.com",
        path: "/home",
        type: "bug" as const,
        fullName: "John Doe",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createBugReport(formData);

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.data.time).toBeDefined();
      expect(callBody.data.type).toBe("bug");
    });

    it("handles API error response when ok is false", async () => {
      const formData = {
        title: "Test Bug",
        description: "Test Description",
        email: "email@example.com",
        path: "/home",
        type: "bug" as const,
        fullName: "John Doe",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation failed",
              details: { errors: [{ path: ["email"] }] },
            },
          }),
      });

      const result = await createBugReport(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.error).toContain("email");
    });

    it("handles API error when ok is true but has error property", async () => {
      const formData = {
        title: "Test Bug",
        description: "Test Description",
        email: "email@example.com",
        path: "/home",
        type: "bug" as const,
        fullName: "John Doe",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Server error",
              details: { errors: [{ path: ["title"] }] },
            },
          }),
      });

      const result = await createBugReport(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Server error");
      expect(result.error).toContain("title");
    });

    it("handles network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const formData = {
        title: "Test Bug",
        description: "Test Description",
        email: "email@example.com",
        path: "/home",
        type: "bug" as const,
        fullName: "John Doe",
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await createBugReport(formData);

      expect(result.error).toBe("Database Error: Failed to create bug report.");
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("createAccessRequest", () => {
    it("successfully creates access request and redirects", async () => {
      const formData = {
        email: "test@northeastern.edu",
        reason: "Testing",
        givenName: "John",
        familyName: "Doe",
        college: "Khoury",
        affiliation: "Student",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      await createAccessRequest(formData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/access-requests"),
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("handles API error when ok is false", async () => {
      const formData = {
        email: "test@northeastern.edu",
        reason: "Testing",
        givenName: "John",
        familyName: "Doe",
        college: "Khoury",
        affiliation: "Student",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Email already exists",
              details: { errors: [{ path: ["email"] }] },
            },
          }),
      });

      const result = await createAccessRequest(formData);

      expect(result?.ok).toBe(false);
      expect(result?.error).toContain("Email already exists");
      expect(result?.error).toContain("email");
    });

    it("handles API error when ok is true but has error property", async () => {
      const formData = {
        email: "test@northeastern.edu",
        reason: "Testing",
        givenName: "John",
        familyName: "Doe",
        college: "Khoury",
        affiliation: "Student",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation error",
              details: { errors: [{ path: ["college"] }] },
            },
          }),
      });

      const result = await createAccessRequest(formData);

      expect(result?.ok).toBe(false);
      expect(result?.error).toContain("Validation error");
      expect(result?.error).toContain("college");
    });

    it("handles network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const formData = {
        email: "test@northeastern.edu",
        reason: "Testing",
        givenName: "John",
        familyName: "Doe",
        college: "Khoury",
        affiliation: "Student",
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await createAccessRequest(formData);

      expect(result?.error).toBe(
        "Database Error: Failed to create access request.",
      );
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("deleteAccessRequest", () => {
    it("successfully deletes access request", async () => {
      const formData = new FormData();
      formData.set("id", "123");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const result = await deleteAccessRequest(formData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/access-requests/123"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(result).toBeUndefined();
    });

    it("handles API error when ok is false", async () => {
      const formData = new FormData();
      formData.set("id", "123");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: "Not found" },
          }),
      });

      const result = await deleteAccessRequest(formData);

      expect(result?.ok).toBe(false);
      expect(result?.error).toBe("Not found");
    });

    it("handles API error when ok is true but has error property", async () => {
      const formData = new FormData();
      formData.set("id", "123");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: "Deletion failed" },
          }),
      });

      const result = await deleteAccessRequest(formData);

      expect(result?.ok).toBe(false);
      expect(result?.error).toBe("Deletion failed");
    });

    it("handles network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const formData = new FormData();
      formData.set("id", "123");

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await deleteAccessRequest(formData);

      expect(result?.error).toBe(
        "Database Error: Failed to delete access request.",
      );
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("deleteReport", () => {
    it("successfully deletes report and revalidates path", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const result = await deleteReport("456");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/reports/456"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin?adminTab=Reports");
      expect(result).toEqual({ success: true });
    });

    it("returns error when response not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await deleteReport("456");

      expect(result).toEqual({ error: "Failed to delete report" });
    });
  });

  describe("createAuthorizedUserWithState", () => {
    it("calls createAuthorizedUser with formData", async () => {
      const formData = new FormData();
      formData.set("email", "test@test.com");
      formData.set("isEnabled", "true");

      (createAuthorizedUser as jest.Mock).mockResolvedValue({
        ok: true,
        message: "User created",
      });

      const result = await createAuthorizedUserWithState({}, formData);

      expect(createAuthorizedUser).toHaveBeenCalledWith(formData);
      expect(result).toEqual({ ok: true, message: "User created" });
    });

    it("passes through error from createAuthorizedUser", async () => {
      const formData = new FormData();
      formData.set("email", "invalid");

      (createAuthorizedUser as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Invalid email",
      });

      const result = await createAuthorizedUserWithState({}, formData);

      expect(result).toEqual({ ok: false, error: "Invalid email" });
    });
  });
});
