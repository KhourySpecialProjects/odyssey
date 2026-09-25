/**
 * Regression tests for the privilege-escalation hole in the authorized-user
 * Server Actions.
 *
 * Root cause: every export in a "use server" module is a callable endpoint.
 * `createAuthorizedUser` accepted a caller-supplied `roleID` and had no
 * authorization gate, so an ordinary signed-in user could mint an account
 * holding the System Admin role. `deleteAuthorizedUser` and
 * `createBatchAuthorizedUsers` were likewise unguarded.
 *
 * These tests pin the fix: an ordinary user must be rejected *before* any
 * request reaches Strapi, while legitimate self-service profile edits keep
 * working.
 */
import {
  createAuthorizedUser,
  createBatchAuthorizedUsers,
  deleteAuthorizedUser,
  updateUserInfo,
} from "@/lib/requests/authorized-user";
import { getAuthorizedUserRoleIdByTitle } from "@/lib/requests/authorized-user-roles";
import { requireRole } from "@/lib/auth/require-role";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("../../lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => data),
}));

jest.mock("../../lib/requests/authorized-user-roles", () => ({
  getAuthorizedUserRoleIdByTitle: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("../../lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

/** The id an attacker would target: the System Admin role row. */
const SYS_ADMIN_ROLE_ID = 1;
/** A normal, non-privileged signed-in user. */
const ORDINARY_USER = {
  id: 42,
  email: "student@northeastern.edu",
  roles: [AuthorizedUserRoleTitle.User],
};
const ADMIN_USER = {
  id: 1,
  email: "admin@northeastern.edu",
  roles: [AuthorizedUserRoleTitle.SysAdmin],
};

/**
 * requireRole() is called with the set of roles the action demands. We emulate
 * the real helper: succeed only when the signed-in user holds an allowed role.
 */
function signInAs(user: {
  id: number;
  email: string;
  roles: AuthorizedUserRoleTitle[];
}) {
  jest
    .mocked(requireRole)
    .mockImplementation(async (allowed: AuthorizedUserRoleTitle[]) => {
      if (allowed.length === 0 || allowed.some((r) => user.roles.includes(r))) {
        return { ok: true, user };
      }
      return { ok: false, error: "forbidden" };
    });
}

function signedOut() {
  jest
    .mocked(requireRole)
    .mockResolvedValue({ ok: false, error: "unauthenticated" });
}

let mockFetch: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch = mockGlobalFetch();
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
  process.env.STRAPI_ACCESS_TOKEN = "test-token";
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.mocked(getAuthorizedUserRoleIdByTitle).mockResolvedValue(4);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function userFormData(email = "attacker@northeastern.edu") {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("isEnabled", "true");
  return fd;
}

describe("privilege escalation — createAuthorizedUser", () => {
  it("rejects an ordinary user who supplies the System Admin role id", async () => {
    signInAs(ORDINARY_USER);

    const result = await createAuthorizedUser(
      userFormData(),
      SYS_ADMIN_ROLE_ID,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
    // The critical assertion: nothing was written. If this fires, the guard
    // ran too late and Strapi already saw a privileged write.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    signedOut();

    const result = await createAuthorizedUser(userFormData());

    expect(result.ok).toBe(false);
    expect(result.error).toBe("unauthenticated");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("still lets a System Admin create a user (no regression)", async () => {
    signInAs(ADMIN_USER);
    mockFetch.mockResolvedValue(makeFetchResponse({ data: { id: 7 } }));

    const result = await createAuthorizedUser(
      userFormData(),
      SYS_ADMIN_ROLE_ID,
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("privilege escalation — delete then recreate", () => {
  it("rejects an ordinary user deleting an account", async () => {
    signInAs(ORDINARY_USER);
    const fd = new FormData();
    fd.set("id", "42");

    const result = await deleteAuthorizedUser(fd);

    expect(result?.ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an ordinary user bulk-creating accounts", async () => {
    signInAs(ORDINARY_USER);

    const result = await createBatchAuthorizedUsers([
      "a@northeastern.edu",
      "b@northeastern.edu",
    ]);

    expect(result.ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("updateUserInfo — privileged fields vs profile fields", () => {
  it("ignores a roles field smuggled into a self profile update", async () => {
    signInAs(ORDINARY_USER);

    const result = await updateUserInfo(ORDINARY_USER.id, {
      bio: "just a student",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_input");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("still allows an ordinary user to edit their own profile fields", async () => {
    signInAs(ORDINARY_USER);
    mockFetch.mockResolvedValue(makeFetchResponse({ data: { id: 42 } }));

    const result = await updateUserInfo(ORDINARY_USER.id, {
      bio: "just a student",
      website: "https://example.com",
    });

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.data.bio).toBe("just a student");
    expect(body.data.website).toBe("https://example.com");
    // No authorization state may ride along on a profile edit.
    expect(body.data).not.toHaveProperty("roles");
    expect(body.data).not.toHaveProperty("isEnabled");
  });

  it("rejects an ordinary user editing someone else's record", async () => {
    signInAs(ORDINARY_USER);

    const result = await updateUserInfo(999, { bio: "not mine" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
