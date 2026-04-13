import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { AuthorizedUser, User } from "@/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedGetCachedUser = jest.mocked(getCachedUser);

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

describe("requireRole", () => {
  // Test 1: No session → unauthenticated
  it("returns unauthenticated when there is no session", async () => {
    mockedGetCurrentUser.mockResolvedValue(undefined);

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });

  // Test 2: Session email doesn't match any authorized user → unauthenticated
  it("returns unauthenticated when session email has no matching authorized user", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "unknown@example.com" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getCachedUser>>,
    );

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(mockedGetCachedUser).toHaveBeenCalledWith("unknown@example.com");
  });

  // Test 3: allowed: [] means any authenticated user passes
  it("returns ok:true when allowed is empty and user is authenticated", async () => {
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

    const result = await requireRole([]);

    expect(result).toEqual({
      ok: true,
      user: {
        id: 7,
        email: "student@northeastern.edu",
        roles: [AuthorizedUserRoleTitle.User],
      },
    });
  });

  // Test 4: User has one of the allowed roles → ok:true
  it("returns ok:true when user has one of the allowed roles", async () => {
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

    const result = await requireRole([
      AuthorizedUserRoleTitle.SysAdmin,
      AuthorizedUserRoleTitle.Faculty,
    ]);

    expect(result).toEqual({
      ok: true,
      user: {
        id: 1,
        email: "admin@northeastern.edu",
        roles: [AuthorizedUserRoleTitle.SysAdmin],
      },
    });
  });

  // Test 5: User has roles but none match → forbidden
  it("returns forbidden when user has roles but none match the allowed list", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "user@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      mockAuthUser({
        id: 5,
        email: "user@northeastern.edu",
        roles: [{ id: 1, title: AuthorizedUserRoleTitle.User }],
      }),
    );

    const result = await requireRole([
      AuthorizedUserRoleTitle.SysAdmin,
      AuthorizedUserRoleTitle.Faculty,
    ]);

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  // Test 6: roles as objects with .title field are extracted correctly
  it("extracts role titles correctly when user.roles contains objects with .title", async () => {
    mockedGetCurrentUser.mockResolvedValue(
      mockUser({ email: "faculty@northeastern.edu" }),
    );
    mockedGetCachedUser.mockResolvedValue(
      mockAuthUser({
        id: 3,
        email: "faculty@northeastern.edu",
        roles: [
          { id: 2, title: AuthorizedUserRoleTitle.Faculty },
          { id: 3, title: AuthorizedUserRoleTitle.ContentCreator },
        ],
      }),
    );

    const result = await requireRole([AuthorizedUserRoleTitle.Faculty]);

    expect(result).toEqual({
      ok: true,
      user: {
        id: 3,
        email: "faculty@northeastern.edu",
        roles: [
          AuthorizedUserRoleTitle.Faculty,
          AuthorizedUserRoleTitle.ContentCreator,
        ],
      },
    });
  });
});
