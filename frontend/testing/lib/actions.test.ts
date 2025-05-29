import {
  completeLesson,
  markLessonAsComplete,
  uploadImage,
  deleteImage,
  deleteNote,
  setTimeZone,
} from "@/lib/actions";
import { S3Client } from "@aws-sdk/client-s3";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  deletePlaylist,
  updatePlaylist,
  createPlaylist,
  deleteGroup,
  deepDeleteDroplet,
  deleteLesson,
} from "@/lib/actions";

import {
  createAuthorizedUser,
  updateAuthorizedUser,
  createAccessRequest,
  createBugReport,
  updateAuthorBio,
  createEnrollment,
  deleteEnrollment,
  createEnrollmentFromEmail,
  createDroplet,
  addLesson,
  createNewTag,
  updateLinkedin,
  updateGithub,
  updatePhoto,
  updateOnboardingInfo,
  updateUserInfo,
  updateFirstTimeStatus,
  createHighlight,
  deleteHighlight,
  getHighlightsForLesson,
} from "@/lib/actions";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { getAuthorizedUserRoleIdByTitle } from "@/lib/requests/authorized-user-roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";

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

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user-roles", () => ({
  getAuthorizedUserRoleIdByTitle: jest.fn(),
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

  jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
  }));

  global.fetch = jest.fn();

  describe("Actions", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockClear();
    });

    describe("deleteNote", () => {
      it("successfully deletes a note", async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deleteNote(123);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/notes/123"),
          expect.objectContaining({
            method: "DELETE",
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer"),
            }),
          }),
        );
        expect(revalidatePath).toHaveBeenCalledWith(
          "/d/[slug]/[lessonSlug]",
          "page",
        );
        expect(revalidateTag).toHaveBeenCalledWith("notes");
        expect(result).toEqual({ ok: true, error: null, data: {} });
      });

      it("handles deletion failure", async () => {
        const mockError = { message: "Failed to delete" };
        const mockResponse = {
          ok: false,
          json: () => Promise.resolve({ error: mockError }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deleteNote(123);

        expect(result).toEqual({
          ok: false,
          error: mockError.message,
          data: null,
        });
      });
    });

    describe("setTimeZone", () => {
      it("successfully updates timezone", async () => {
        const mockResponse = { ok: true };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await setTimeZone("America/New_York", 123);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/authorized-users/123"),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({
              data: { timeZone: "America/New_York" },
            }),
          }),
        );
        expect(result).toEqual({ success: true });
      });

      it("handles timezone update failure", async () => {
        const mockResponse = { ok: false };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await setTimeZone("Invalid/Zone", 123);

        expect(result).toEqual({
          success: false,
          error: expect.any(Error),
        });
      });
    });

    describe("deletePlaylist", () => {
      it("handles playlist deletion failure", async () => {
        const mockResponse = { ok: false };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deletePlaylist(123);

        expect(result).toEqual({
          error: "Database Error: Failed to Delete Playlist.",
        });
      });
    });

    describe("updatePlaylist", () => {
      const mockPlaylistData = {
        name: "Test Playlist",
        isPublic: true,
        droplets: [{ id: 1 }],
        userId: 123,
        slug: "test-playlist",
      };

      it("successfully updates a playlist", async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: mockPlaylistData }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await updatePlaylist(123, mockPlaylistData);

        expect(revalidateTag).toHaveBeenCalledWith("playlists");
        expect(result).toEqual({
          ok: true,
          error: null,
          data: mockPlaylistData,
        });
      });

      it("handles playlist update failure", async () => {
        const mockResponse = {
          ok: false,
          json: () => Promise.resolve({ error: { message: "Update failed" } }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await updatePlaylist(123, mockPlaylistData);

        expect(result).toEqual({
          ok: false,
          error: "Update failed",
          data: null,
        });
      });
    });

    describe("createPlaylist", () => {
      const mockPlaylistData = {
        name: "New Playlist",
        isPublic: true,
        droplets: [{ id: 1 }],
        author: { id: 123 },
        userId: 123,
      };

      it("successfully creates a playlist", async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: mockPlaylistData }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await createPlaylist(mockPlaylistData);

        expect(revalidateTag).toHaveBeenCalledWith("playlists");
        expect(result).toEqual({
          ok: true,
          error: null,
          data: mockPlaylistData,
        });
      });

      it("handles playlist creation failure", async () => {
        const mockResponse = {
          ok: false,
          json: () =>
            Promise.resolve({ error: { message: "Creation failed" } }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await createPlaylist(mockPlaylistData);

        expect(result).toEqual({
          ok: false,
          error: "Creation failed",
          data: null,
        });
      });
    });

    describe("deleteGroup", () => {
      it("handles group deletion failure", async () => {
        const mockResponse = { ok: false };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deleteGroup(123);

        expect(result).toEqual({
          error: "Database Error: Failed to Delete Group.",
        });
      });
    });

    describe("deepDeleteDroplet", () => {
      it("handles droplet deletion failure", async () => {
        const mockResponse = { ok: false };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deepDeleteDroplet(123);

        expect(result).toEqual({
          error: "Database Error: Failed to Delete Droplet.",
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
  });

  describe("User Management Actions", () => {
    describe("updateAuthorizedUser", () => {
      it("successfully updates an authorized user", async () => {
        const formData = new FormData();
        formData.append("id", "123");
        formData.append("isEnabled", "true");

        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        await updateAuthorizedUser(formData);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/authorized-users/123"),
          expect.objectContaining({
            method: "PUT",
            body: expect.stringContaining("isEnabled"),
          }),
        );
      });
    });

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

    describe("createNewTag", () => {
      it("successfully creates a new tag", async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await createNewTag("Test Tag");

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/tags"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("Test Tag"),
          }),
        );
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe("Profile Management Actions", () => {
    describe("updateAuthorBio", () => {
      it("successfully updates author bio", async () => {
        const mockResponse = { ok: true };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await updateAuthorBio("New bio", 123);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/authorized-users/123"),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({
              data: { bio: "New bio" },
            }),
          }),
        );
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe("Enrollment Management Actions", () => {
    describe("deleteEnrollment", () => {
      it("handles enrollment deletion failure", async () => {
        const mockResponse = {
          ok: false,
          json: () =>
            Promise.resolve({
              error: { message: "Failed to delete" },
            }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await deleteEnrollment({
          droplet: 123,
          viewedLessons: [],
        });

        expect(result).toEqual({
          error: "Database Error: Failed to unenroll.",
        });
      });
    });

    describe("createEnrollmentFromEmail", () => {
      it("handles enrollment creation failure", async () => {
        const mockResponse = {
          ok: false,
          json: () =>
            Promise.resolve({
              error: { message: "Failed to create" },
            }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await createEnrollmentFromEmail(
          { droplet: 123, viewedLessons: [] },
          "test@example.com",
        );

        expect(result).toEqual({
          error: "Database Error: Failed to enroll.",
        });
      });
    });
  });

  describe("Playlist Actions", () => {
    it("should create a playlist", async () => {
      const mockPlaylistData = {
        name: "Test Playlist",
        isPublic: true,
        droplets: [{ id: 1 }],
        author: { id: 1 },
        userId: 1,
      };

      const result = await createPlaylist(mockPlaylistData);
      expect(result).toBeDefined();
    });

    it("should update a playlist", async () => {
      const mockUpdateData = {
        name: "Updated Playlist",
        isPublic: false,
        droplets: [{ id: 1 }],
        authors: { id: 1 },
        userId: 1,
      };

      const result = await updatePlaylist(1, mockUpdateData);
      expect(result).toBeDefined();
    });

    it("should delete a playlist", async () => {
      const result = await deletePlaylist(1);
      expect(result).toBeDefined();
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

    describe("Authorized User Actions", () => {
      it("should create authorized user", async () => {
        const formData = new FormData();
        formData.append("email", "test@northeastern.edu");
        formData.append("isEnabled", "true");

        (getAuthorizedUserRoleIdByTitle as jest.Mock).mockImplementation(() =>
          Promise.resolve(1),
        );

        const result = await createAuthorizedUser({}, formData);
        expect(result.ok).toBe(true);
      });
    });

    describe("Access Request Actions", () => {
      it("should create access request", async () => {
        const formData = {
          email: "test@example.com",
          reason: "Testing",
          givenName: "person",
          affiliation: "student",
          familyName: "lastName",
          college: "neu",
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        await expect(createAccessRequest(formData)).rejects.toThrow();
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

    describe("User Profile Actions", () => {
      it("should update author bio", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updateAuthorBio("New bio", 1);
        expect(result.success).toBe(true);
      });

      it("should update linkedin", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updateLinkedin("linkedin.com/test", 1);
        expect(result.success).toBe(true);
      });

      it("should update github", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updateGithub("github.com/test", 1);
        expect(result.success).toBe(true);
      });

      it("should update photo", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updatePhoto("https://example.com/photo.jpg", 1);
        expect(result.success).toBe(true);
      });

      it("should update onboarding info", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updateOnboardingInfo("John", "Doe", "Bio", 1);
        expect(result.success).toBe(true);
      });

      it("should update user info", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        (getAuthorizedUserRoleIdByTitle as jest.Mock).mockImplementation(() =>
          Promise.resolve(1),
        );

        const result = await updateUserInfo(
          "John",
          "Doe",
          "Bio",
          ["User" as AuthorizedUserRoleTitle],
          "photo.jpg",
          1,
        );
        expect(result.success).toBe(true);
      });

      it("should update first time status", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await updateFirstTimeStatus(1);
        expect(result.success).toBe(true);
      });
    });

    describe("Enrollment Actions", () => {
      beforeEach(() => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          email: "test@example.com",
        });
        (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({ id: 1 });
        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);
      });

      it("should create enrollment", async () => {
        const droplet = {
          id: 1,
          name: "Test Droplet",
          slug: "test-droplet",
          isHidden: false,
          focusArea: "personal" as FocusArea,
          type: "knowledge" as DropletType,
          tags: [{ id: 1, name: "React" }] as Tag[],
          learningObjectives: [],
          status: "published" as DropletStatus,
          droplet_lessons: [],
        };
        const viewedLessons = [
          {
            id: 1,
            name: "Test Lesson",
            slug: "test-lesson",
            droplet_lessons: [],
            droplets: [],
            notes: [],
            blocks: [
              {
                id: 1,
                __component: "droplets.generic",
                content: "Generic content",
              },
            ],
          },
        ];

        const result = await createEnrollment(droplet, viewedLessons);
        expect(result.ok).toBe(true);
      });
    });

    describe("Droplet Actions", () => {
      beforeEach(() => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          email: "test@example.com",
        });
        (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({ id: 1 });
      });

      it("should create droplet", async () => {
        const data = {
          name: "Test Droplet",
          focusArea: "Test Area",
          type: "test",
          tagIds: [1],
          learningObjectives: ["Objective 1"],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await createDroplet(data);
        expect(result.ok).toBe(true);
      });

      it("should add lesson", async () => {
        const formData = {
          name: "Test Lesson",
          dropletId: 1,
          orderIndex: 1,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await addLesson(formData);
        expect(result.ok).toBe(true);
      });
    });

    describe("Tag Actions", () => {
      it("should create new tag", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await createNewTag("Test Tag");
        expect(result.success).toBe(true);
      });
    });

    describe("Error Handling", () => {
      it("should handle invalid email format", async () => {
        const formData = new FormData();
        formData.append("email", "invalid-email");
        formData.append("isEnabled", "true");

        (getAuthorizedUserRoleIdByTitle as jest.Mock).mockImplementation(() =>
          Promise.resolve(1),
        );

        const result = await createAuthorizedUser({}, formData);
        expect(result.ok).toBe(false);
      });
    });
  });

  jest.mock("@/lib/auth/session", () => ({
    getCurrentUser: jest.fn(),
  }));

  jest.mock("@/lib/requests/authorized-user", () => ({
    getAuthorizedUserByEmail: jest.fn(),
  }));

  global.fetch = jest.fn();

  describe("Highlight and Note Actions", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("Highlight Actions", () => {
      it("should create highlight", async () => {
        const highlightData = {
          data: {
            content: "Test highlight",
            lesson: 1,
            user: 1,
          },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await createHighlight(highlightData);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe(1);
      });

      it("should handle highlight creation error", async () => {
        const highlightData = {
          data: {
            content: "Test highlight",
            lesson: 1,
            user: 1,
          },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to create highlight" }),
        });

        await expect(createHighlight(highlightData)).rejects.toThrow();
      });

      it("should delete highlight", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        const result = await deleteHighlight(1);
        expect(result).toBeDefined();
        expect(result.data.id).toBe(1);
      });

      it("should handle get highlights error", async () => {
        (getCurrentUser as jest.Mock).mockImplementation(() =>
          Promise.resolve({ email: "test@example.com" }),
        );
        (getAuthorizedUserByEmail as jest.Mock).mockImplementation(() =>
          Promise.resolve({ id: 1 }),
        );

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to get highlights" }),
        });

        const result = await getHighlightsForLesson(1);
        expect(result.error).toBeDefined();
      });
    });

    describe("Error Cases", () => {
      it("should handle network errors", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(
          new Error("Network error"),
        );

        await expect(
          createHighlight({ data: { content: "Test" } }),
        ).rejects.toThrow();
      });

      it("should handle missing user email", async () => {
        (getCurrentUser as jest.Mock).mockImplementation(() =>
          Promise.resolve(null),
        );

        await expect(getHighlightsForLesson(1)).rejects.toThrow(
          "No email identified",
        );
      });
    });
  });
});
