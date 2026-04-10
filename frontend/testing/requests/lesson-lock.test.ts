import {
  acquireLessonLock,
  releaseLessonLock,
  heartbeatLessonLock,
  getLessonLockStatus,
  getCurrentAuthorizedUserId,
} from "@/lib/requests/lesson-lock";

global.fetch = jest.fn();

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(() =>
    Promise.resolve({ email: "test@northeastern.edu" }),
  ),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(() =>
    Promise.resolve({ id: 42, firstName: "Test", lastName: "User" }),
  ),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(() => Promise.resolve({ id: 42, roles: [] })),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(() =>
    Promise.resolve({
      ok: true,
      user: { id: 42, email: "test@northeastern.edu", roles: [] },
    }),
  ),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

describe("Lesson Lock API Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    // Restore the default authenticated mock after clearAllMocks
    const { requireRole } = require("@/lib/auth/require-role");
    (requireRole as jest.Mock).mockResolvedValue({
      ok: true,
      user: { id: 42, email: "test@northeastern.edu", roles: [] },
    });
  });

  describe("getCurrentAuthorizedUserId", () => {
    it("returns user id when authenticated", async () => {
      const id = await getCurrentAuthorizedUserId();
      expect(id).toBe(42);
    });

    it("returns null when not authenticated", async () => {
      const { getCurrentUser } = require("@/lib/auth/session");
      getCurrentUser.mockResolvedValueOnce(null);

      const id = await getCurrentAuthorizedUserId();
      expect(id).toBeNull();
    });
  });

  describe("acquireLessonLock", () => {
    it("returns success when lock is acquired", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locked: true, lockedBy: 42 }),
      });

      const result = await acquireLessonLock(1);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/lessons/1/lock"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: 42 }),
        }),
      );
    });

    it("resolves userId from session (not from caller)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await acquireLessonLock(1);

      // Wire format still sends userId to Strapi — but it must be the session user's id (42)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ userId: 42 }),
        }),
      );
    });

    it("returns lockedBy info on 409 conflict", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: "Lesson is locked",
            lockedBy: { id: 99, firstName: "Other", lastName: "User" },
          }),
      });

      const result = await acquireLessonLock(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Lesson is locked");
      expect(result.lockedBy).toEqual({
        id: 99,
        firstName: "Other",
        lastName: "User",
      });
    });

    it("returns generic error on non-409 failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await acquireLessonLock(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to acquire lock");
    });

    it("returns { success: false, error: 'unauthenticated' } when not authenticated", async () => {
      const { requireRole } = require("@/lib/auth/require-role");
      (requireRole as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: "unauthenticated",
      });

      const result = await acquireLessonLock(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("unauthenticated");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("releaseLessonLock", () => {
    it("calls DELETE with userId query param from session", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await releaseLessonLock(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/lessons/1/lock?userId=42"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("does not call fetch when not authenticated", async () => {
      const { requireRole } = require("@/lib/auth/require-role");
      (requireRole as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: "unauthenticated",
      });

      await releaseLessonLock(1);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("heartbeatLessonLock", () => {
    it("returns true on success", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await heartbeatLessonLock(1);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/lessons/1/lock/heartbeat"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ userId: 42 }),
        }),
      );
    });

    it("returns false on failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });

      const result = await heartbeatLessonLock(1);

      expect(result).toBe(false);
    });

    it("returns false when not authenticated", async () => {
      const { requireRole } = require("@/lib/auth/require-role");
      (requireRole as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: "unauthenticated",
      });

      const result = await heartbeatLessonLock(1);

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("getLessonLockStatus", () => {
    it("returns lock status when locked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            isLocked: true,
            lockedBy: { id: 99, firstName: "Other", lastName: "User" },
            lockedAt: "2026-04-08T12:00:00.000Z",
          }),
      });

      const result = await getLessonLockStatus(1);

      expect(result.isLocked).toBe(true);
      expect(result.lockedBy?.id).toBe(99);
    });

    it("returns unlocked status when not locked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            isLocked: false,
            lockedBy: null,
            lockedAt: null,
          }),
      });

      const result = await getLessonLockStatus(1);

      expect(result.isLocked).toBe(false);
      expect(result.lockedBy).toBeNull();
    });

    it("returns default unlocked on fetch failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await getLessonLockStatus(1);

      expect(result.isLocked).toBe(false);
      expect(result.lockedBy).toBeNull();
    });
  });
});
