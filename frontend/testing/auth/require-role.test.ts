import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

const { getCurrentUser } = require("@/lib/auth/session");
const { getCachedUser } = require("@/lib/requests/cached");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireRole", () => {
  // Test 1: No session → unauthenticated
  it("returns unauthenticated when there is no session", async () => {
    getCurrentUser.mockResolvedValue(undefined);

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });

  // Test 2: Session email doesn't match any authorized user → unauthenticated
  it("returns unauthenticated when session email has no matching authorized user", async () => {
    getCurrentUser.mockResolvedValue({ email: "unknown@example.com" });
    getCachedUser.mockResolvedValue(null);

    const result = await requireRole([]);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(getCachedUser).toHaveBeenCalledWith("unknown@example.com");
  });

  // Test 3: allowed: [] means any authenticated user passes
  it("returns ok:true when allowed is empty and user is authenticated", async () => {
    getCurrentUser.mockResolvedValue({ email: "student@northeastern.edu" });
    getCachedUser.mockResolvedValue({
      id: 7,
      email: "student@northeastern.edu",
      roles: [AuthorizedUserRoleTitle.User],
    });

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
    getCurrentUser.mockResolvedValue({ email: "admin@northeastern.edu" });
    getCachedUser.mockResolvedValue({
      id: 1,
      email: "admin@northeastern.edu",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

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
    getCurrentUser.mockResolvedValue({ email: "user@northeastern.edu" });
    getCachedUser.mockResolvedValue({
      id: 5,
      email: "user@northeastern.edu",
      roles: [AuthorizedUserRoleTitle.User],
    });

    const result = await requireRole([
      AuthorizedUserRoleTitle.SysAdmin,
      AuthorizedUserRoleTitle.Faculty,
    ]);

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  // Test 6: roles as objects with .title field are extracted correctly
  it("extracts role titles correctly when user.roles contains objects with .title", async () => {
    getCurrentUser.mockResolvedValue({ email: "faculty@northeastern.edu" });
    getCachedUser.mockResolvedValue({
      id: 3,
      email: "faculty@northeastern.edu",
      roles: [
        { id: 2, title: AuthorizedUserRoleTitle.Faculty },
        { id: 3, title: AuthorizedUserRoleTitle.ContentCreator },
      ],
    });

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
