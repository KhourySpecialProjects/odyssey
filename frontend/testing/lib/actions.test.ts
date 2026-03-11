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
  createCreationRequest,
  approveCreationRequest,
  deleteCreationRequest,
  fetchCreationRequests,
  fetchCreationRequestByUser,
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

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: "text", text: "## Acceptance Criteria\n- [ ] generated criteria" }]
      })
    }
  }));
});

const { redirect } = require("next/navigation");
const { revalidatePath, revalidateTag } = require("next/cache");

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
        sessionUrl: "https://posthog.com/replay/123",
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
        sessionUrl: "https://posthog.com/replay/123",
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
        sessionUrl: "https://posthog.com/replay/123",
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
        sessionUrl: "https://posthog.com/replay/123",
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
        sessionUrl: "https://posthog.com/replay/123",
      };

      (global.fetch as jest.Mock).mockRejectedValue(
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
      expect(revalidateTag).toHaveBeenCalledWith("reports");
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

  describe("createCreationRequest", () => {
    it("successfully creates creation request", async () => {
      const formData = {
        motivation: "I want to create educational content",
        dropletIdea: "Something unique",
        user: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      const result = await createCreationRequest(formData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/creation-requests"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ data: formData }),
        }),
      );
      expect(result).toEqual({
        ok: true,
        data: { data: { id: 1 } },
        error: null,
      });
    });

    it("handles API error when ok is false", async () => {
      const formData = {
        motivation: "I want to create educational content",
        dropletIdea: "Something unique",
        user: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              message: "Validation failed",
              details: { errors: [{ path: ["motivation"] }] },
            },
          }),
      });

      const result = await createCreationRequest(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.error).toContain("motivation");
    });

    it("handles API error when ok is true but has error property", async () => {
      const formData = {
        motivation: "I want to create educational content",
        dropletIdea: "Something unique",
        user: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              message: "Server error",
              details: { errors: [{ path: ["user"] }] },
            },
          }),
      });

      const result = await createCreationRequest(formData);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Server error");
      expect(result.error).toContain("user");
    });

    it("handles network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const formData = {
        motivation: "I want to create educational content",
        dropletIdea: "Something unique",
        user: 1,
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await createCreationRequest(formData);

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to create creation request.",
        data: null,
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("approveCreationRequest", () => {
    it("successfully approves creation request and grants Content Creator role", async () => {
      // Mock fetching user data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: {
                  data: [{ id: 1 }], // Existing role
                },
              },
            },
          }),
      });

      // Mock fetching Content Creator role
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: 2 }], // Content Creator role ID
          }),
      });

      // Mock updating user roles
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      // Mock deleting creation request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({ ok: true, error: null, data: null });
      expect(revalidateTag).toHaveBeenCalledWith("users");
      expect(revalidateTag).toHaveBeenCalledWith("creation-requests");
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it("skips role update if user already has Content Creator role", async () => {
      // Mock fetching user data with Content Creator role already present
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: {
                  data: [{ id: 2 }], // Already has Content Creator role
                },
              },
            },
          }),
      });

      // Mock fetching Content Creator role
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: 2 }],
          }),
      });

      // Mock deleting creation request (skips role update)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({ ok: true, error: null, data: null });
      expect(global.fetch).toHaveBeenCalledTimes(3); // No role update call
    });

    it("handles failure to fetch user data", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Failed to fetch user data",
        data: null,
      });
      expect(consoleError).toHaveBeenCalledWith("Failed to fetch user data");
      consoleError.mockRestore();
    });

    it("handles failure to fetch Content Creator role", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: { data: [] },
              },
            },
          }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Failed to fetch Content Creator role",
        data: null,
      });
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch Content Creator role",
      );
      consoleError.mockRestore();
    });

    it("handles Content Creator role not found in system", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: { data: [] },
              },
            },
          }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }), // No roles found
      });

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Content Creator role not found in system",
        data: null,
      });
      expect(consoleError).toHaveBeenCalledWith(
        "Content Creator role not found",
      );
      consoleError.mockRestore();
    });

    it("handles failure to update user roles", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: { data: [{ id: 1 }] },
              },
            },
          }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 2 }] }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Update failed" }),
      });

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Failed to update user roles",
        data: null,
      });
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to update user roles:",
        { error: "Update failed" },
      );
      consoleError.mockRestore();
    });

    it("handles failure to delete creation request", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                roles: { data: [{ id: 2 }] },
              },
            },
          }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 2 }] }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Failed to delete creation request",
        data: null,
      });
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to delete creation request",
      );
      consoleError.mockRestore();
    });

    it("handles network exception", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await approveCreationRequest("123", 1);

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to approve creation request.",
        data: null,
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("deleteCreationRequest", () => {
    it("successfully deletes creation request and revalidates path", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await deleteCreationRequest("123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/creation-requests/123"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("creation-requests");
      expect(result).toEqual({ ok: true, error: null, data: null });
    });

    it("handles deletion failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await deleteCreationRequest("123");

      expect(result).toEqual({
        ok: false,
        error: "Failed to delete creation request",
        data: null,
      });
    });

    it("handles network exception", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const result = await deleteCreationRequest("123");

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to delete creation request.",
        data: null,
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("fetchCreationRequests", () => {
    it("successfully fetches all creation requests with pagination", async () => {
      // First page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: Array(250).fill({
              id: 1,
              attributes: {
                reason: "Test reason",
                user: {
                  data: {
                    id: 1,
                    attributes: {
                      firstName: "John",
                      lastName: "Doe",
                      email: "john@example.com",
                    },
                  },
                },
              },
            }),
          }),
      });

      // Second page (partial)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: Array(100).fill({
              id: 2,
              attributes: {
                reason: "Another reason",
                user: {
                  data: {
                    id: 2,
                    attributes: {
                      firstName: "Jane",
                      lastName: "Smith",
                      email: "jane@example.com",
                    },
                  },
                },
              },
            }),
          }),
      });

      const result = await fetchCreationRequests();

      expect(result.length).toBe(350);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("handles single page of results", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 1,
                attributes: {
                  reason: "Test reason",
                  user: {
                    data: {
                      id: 1,
                      attributes: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                      },
                    },
                  },
                },
              },
            ],
          }),
      });

      const result = await fetchCreationRequests();

      expect(result.length).toBe(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("handles fetch failure and returns empty array", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Fetch failed" }),
      });

      const result = await fetchCreationRequests();

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch creation requests",
        { error: "Fetch failed" },
      );
      consoleError.mockRestore();
    });

    it("handles network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(fetchCreationRequests()).rejects.toThrow(
        "Failed to fetch creation requests data.",
      );
      expect(consoleError).toHaveBeenCalledWith(
        "Database Error:",
        expect.any(Error),
      );
      consoleError.mockRestore();
    });
  });

  describe("fetchCreationRequestByUser", () => {
    it("successfully fetches creation request for a user", async () => {
      const mockRequest = {
        id: 1,
        attributes: {
          motivation: "Test motivation",
          dropletIdea: "Test idea",
          user: {
            data: {
              id: 1,
              attributes: {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
              },
            },
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockRequest],
          }),
      });

      const result = await fetchCreationRequestByUser(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/creation-requests"),
        expect.objectContaining({
          next: { tags: ["creation-requests"], revalidate: 900 },
        }),
      );
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
    });

    it("returns null when no creation request exists for user", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      });

      const result = await fetchCreationRequestByUser(999);

      expect(result).toBeNull();
    });

    it("returns null when fetch fails", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await fetchCreationRequestByUser(1);

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch creation request by user",
      );
      consoleError.mockRestore();
    });

    it("returns null on network exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await fetchCreationRequestByUser(1);

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        "Database Error:",
        expect.any(Error),
      );
      consoleError.mockRestore();
    });

    it("includes correct query parameters for user filtering", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      });

      await fetchCreationRequestByUser(5);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain("filters");
      expect(fetchCall).toContain("user");
      expect(fetchCall).toContain("populate");
    });

    it("returns only the first request when multiple exist", async () => {
      const mockRequests = [
        {
          id: 1,
          attributes: {
            motivation: "First request",
            dropletIdea: "First idea",
            user: {
              data: {
                id: 1,
                attributes: {
                  firstName: "John",
                  lastName: "Doe",
                  email: "john@example.com",
                },
              },
            },
          },
        },
        {
          id: 2,
          attributes: {
            motivation: "Second request",
            dropletIdea: "Second idea",
            user: {
              data: {
                id: 1,
                attributes: {
                  firstName: "John",
                  lastName: "Doe",
                  email: "john@example.com",
                },
              },
            },
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockRequests,
          }),
      });

      const result = await fetchCreationRequestByUser(1);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
    });

    it("uses no-store cache setting", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      });

      await fetchCreationRequestByUser(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { tags: ["creation-requests"], revalidate: 900 },
        }),
      );
    });

    it("includes authorization header", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
          }),
      });

      await fetchCreationRequestByUser(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        }),
      );
    });
  });
});
