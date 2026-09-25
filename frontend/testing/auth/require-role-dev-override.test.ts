import { requireRole } from "@/lib/auth/require-role";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getDevRoleOverride } from "@/lib/auth/dev-role-override";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { AuthorizedUser, User } from "@/types";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/auth/dev-role-override", () => ({
  getDevRoleOverride: jest.fn(),
}));

const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedGetCachedUser = jest.mocked(getCachedUser);
const mockedGetDevRoleOverride = jest.mocked(getDevRoleOverride);

/** Partial User for mock — only fields requireRole actually reads */
function mockUser(overrides: Partial<User> & { email: string }): User {
  return { roles: [], isActive: true, ...overrides } as User;
}

/** Partial AuthorizedUser for mock — only fields requireRole actually reads */
function mockAuthUser(
  overrides: Partial<AuthorizedUser> & { id: number },
): AuthorizedUser {
  return overrides as unknown as AuthorizedUser;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireRole dev-role-override", () => {
  it("raises the caller's role when the override is higher than the Strapi role", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "student@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      mockAuthUser({
        id: 7,
        email: "student@northeastern.edu",
        roles: [{ id: 1, title: AuthorizedUserRoleTitle.User }],
      }),
    );
    mockedGetDevRoleOverride.mockResolvedValue([
      AuthorizedUserRoleTitle.SysAdmin,
    ]);

    const result = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);

    expect(result).toEqual({
      ok: true,
      user: {
        id: 7,
        email: "student@northeastern.edu",
        roles: [AuthorizedUserRoleTitle.SysAdmin],
      },
    });
  });

  it("lowers the caller's role when the override is lower than the Strapi role", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "admin@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      mockAuthUser({
        id: 1,
        email: "admin@northeastern.edu",
        roles: [{ id: 1, title: AuthorizedUserRoleTitle.SysAdmin }],
      }),
    );
    mockedGetDevRoleOverride.mockResolvedValue([AuthorizedUserRoleTitle.User]);

    const result = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("uses the Strapi roles when there is no override", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "admin@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      mockAuthUser({
        id: 1,
        email: "admin@northeastern.edu",
        roles: [{ id: 1, title: AuthorizedUserRoleTitle.SysAdmin }],
      }),
    );
    mockedGetDevRoleOverride.mockResolvedValue(null);

    const result = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);

    expect(result).toEqual({
      ok: true,
      user: {
        id: 1,
        email: "admin@northeastern.edu",
        roles: [AuthorizedUserRoleTitle.SysAdmin],
      },
    });
  });

  it("stays unauthenticated when logged out, even with an override present", async () => {
    mockedGetCurrentUser.mockResolvedValue(undefined);
    mockedGetDevRoleOverride.mockResolvedValue([
      AuthorizedUserRoleTitle.SysAdmin,
    ]);

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(mockedGetCachedUser).not.toHaveBeenCalled();
  });

  it("stays unauthenticated when the Strapi user is missing, even with an override present", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "ghost@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getCachedUser>>,
    );
    mockedGetDevRoleOverride.mockResolvedValue([
      AuthorizedUserRoleTitle.SysAdmin,
    ]);

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });
});
