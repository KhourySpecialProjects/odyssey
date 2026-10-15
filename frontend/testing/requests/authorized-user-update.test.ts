/**
 * Security tests for updateUserInfo.
 *
 * Covers:
 *  1. Unauthenticated caller is rejected.
 *  2. Authenticated non-admin editing another user is rejected (forbidden).
 *  3. Non-admin editing self with admin-only field (roles) is rejected.
 *  4. Non-admin editing self with allowed fields succeeds.
 *  5. Admin editing any user succeeds.
 *  6. Admin editing self succeeds.
 *  7. Admin attempting to set an invalid role enum returns validation error.
 *  8. Admin editing with empty updates — strips to empty body, still succeeds (no-op).
 */

import { updateUserInfo } from "@/lib/requests/authorized-user";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireRole } from "@/lib/auth/require-role";
import { getAuthorizedUserRoleIdByTitle } from "@/lib/requests/authorized-user-roles";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// ---- module mocks -------------------------------------------------------

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user-roles", () => ({
  getAuthorizedUserRoleIdByTitle: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

// ---- helpers ------------------------------------------------------------

const mockRequireRole = requireRole as jest.Mock;
const mockGetRoleId = getAuthorizedUserRoleIdByTitle as jest.Mock;

function mockAdmin(id = 1) {
  mockRequireRole.mockResolvedValue({
    ok: true,
    user: {
      id,
      email: "admin@test.com",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    },
  });
}

function mockNonAdmin(id = 42) {
  mockRequireRole.mockResolvedValue({
    ok: true,
    user: {
      id,
      email: "user@test.com",
      roles: [AuthorizedUserRoleTitle.User],
    },
  });
}

function mockUnauthenticated() {
  mockRequireRole.mockResolvedValue({
    ok: false,
    error: "unauthenticated",
  });
}

// ---- setup / teardown ---------------------------------------------------

global.fetch = jest.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
  process.env.STRAPI_ACCESS_TOKEN = "test-token";
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetRoleId.mockResolvedValue(1);
  // Default fetch: success
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: 1 } }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---- tests --------------------------------------------------------------

describe("updateUserInfo — auth + validation security", () => {
  // 1 -------------------------------------------------------------------
  it("rejects unauthenticated callers", async () => {
    mockUnauthenticated();

    const result = await updateUserInfo(1, { first: "Hacker" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("unauthenticated");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 2 -------------------------------------------------------------------
  it("rejects authenticated non-admin editing another user", async () => {
    // caller is user id=42, trying to edit user id=99
    mockNonAdmin(42);

    const result = await updateUserInfo(99, { first: "Victim" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 3 -------------------------------------------------------------------
  it("rejects non-admin editing self with admin-only field (roles)", async () => {
    // caller id=42 editing own record (userId=42), but passing roles
    mockNonAdmin(42);

    const result = await updateUserInfo(42, {
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    // UpdateUserInfoSelfSchema is .strict(), so roles is an unknown key
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_input");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 4 -------------------------------------------------------------------
  it("allows non-admin editing self with allowed fields", async () => {
    // caller id=42 editing own record
    mockNonAdmin(42);

    const result = await updateUserInfo(42, {
      first: "Alice",
      last: "Smith",
      bio: "Developer",
      linkedin: "https://linkedin.com/in/alice",
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/authorized-users/42"),
      expect.objectContaining({ method: "PUT" }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data.firstName).toBe("Alice");
    expect(body.data.lastName).toBe("Smith");
    expect(body.data.bio).toBe("Developer");
    expect(body.data.linkedin).toBe("https://linkedin.com/in/alice");
  });

  // 5 -------------------------------------------------------------------
  it("allows admin editing any user (not self)", async () => {
    // caller id=1 (admin) editing user id=99
    mockAdmin(1);
    mockGetRoleId.mockResolvedValue(2);

    const result = await updateUserInfo(99, {
      first: "Bob",
      isEnabled: false,
      roles: [AuthorizedUserRoleTitle.ContentCreator],
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/authorized-users/99"),
      expect.objectContaining({ method: "PUT" }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data.firstName).toBe("Bob");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.roles.set).toEqual([{ id: 2 }]);
  });

  // 6 -------------------------------------------------------------------
  it("allows admin editing self", async () => {
    // caller id=1 (admin) editing own record (userId=1)
    mockAdmin(1);

    const result = await updateUserInfo(1, {
      bio: "Updated bio",
      isPublic: true,
    });

    expect(result.ok).toBe(true);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data.bio).toBe("Updated bio");
    expect(body.data.isPublic).toBe(true);
  });

  // 7 -------------------------------------------------------------------
  it("rejects admin setting an invalid role enum value", async () => {
    mockAdmin(1);

    // Cast to bypass TS type — simulating a malformed runtime payload
    const result = await updateUserInfo(99, {
      roles: ["NotARealRole"] as unknown as AuthorizedUserRoleTitle[],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_input");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 8 -------------------------------------------------------------------
  it("succeeds (no-op) when admin passes empty updates", async () => {
    // Empty object passes schema validation (all fields optional).
    // The Strapi PUT body will be empty but we still make the call.
    mockAdmin(1);

    const result = await updateUserInfo(99, {});

    expect(result.ok).toBe(true);
    // fetch IS called — empty body is a valid no-op PUT
    expect(global.fetch).toHaveBeenCalled();
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data).toEqual({});
  });
});

describe("updateUserInfo — cache invalidation", () => {
  const mockRevalidateTag = revalidateTag as jest.Mock;

  it("self edit of firstTime only revalidates the per-user tag", async () => {
    mockNonAdmin(42);

    const result = await updateUserInfo(42, { firstTime: false });

    expect(result.ok).toBe(true);
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.user("user@test.com"),
    );
    expect(mockRevalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.users);
    expect(mockRevalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.authors);
  });

  it("self edit of isPublic only revalidates the per-user tag", async () => {
    mockNonAdmin(42);

    await updateUserInfo(42, { isPublic: true });

    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.user("user@test.com"),
    );
  });

  it("self edit of name keeps the global users + authors sweep", async () => {
    // Names show in the admin user list, user search, and creator lists.
    mockNonAdmin(42);

    await updateUserInfo(42, { first: "Alice", firstTime: false });

    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.user("user@test.com"),
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.users);
    expect(mockRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.authors);
  });

  it("admin editing another user sweeps globally (target email unknown)", async () => {
    mockAdmin(1);

    await updateUserInfo(99, { isPublic: false });

    expect(mockRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.users);
    expect(mockRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.authors);
    expect(mockRevalidateTag).not.toHaveBeenCalledWith(
      CACHE_TAGS.user("admin@test.com"),
    );
  });

  it("does not revalidate when the input is rejected", async () => {
    mockNonAdmin(42);

    await updateUserInfo(99, { firstTime: false });

    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
