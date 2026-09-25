import fs from "fs";
import path from "path";
import { withAuth, assertOwner, type AuthUser } from "@/lib/auth/guards";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);

function authUser(overrides: Partial<AuthUser> & { id: number }): AuthUser {
  return {
    email: "user@northeastern.edu",
    roles: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("withAuth", () => {
  it("returns an AuthFailure and does not call the handler when unauthenticated", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });
    const handler = jest.fn();

    const result = await withAuth([], handler);

    expect(result).toEqual({
      ok: false,
      error: "unauthenticated",
      data: null,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns an AuthFailure and does not call the handler when forbidden", async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: "forbidden" });
    const handler = jest.fn();

    const result = await withAuth([AuthorizedUserRoleTitle.SysAdmin], handler);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls the handler once with gate.user and returns its value when ok", async () => {
    const user = authUser({ id: 7, roles: [AuthorizedUserRoleTitle.User] });
    mockedRequireRole.mockResolvedValue({ ok: true, user });
    const handler = jest.fn().mockResolvedValue({ success: true });

    const result = await withAuth([], handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(user);
    expect(result).toEqual({ success: true });
  });

  it("forwards the roles argument to requireRole unchanged", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });
    const roles = [
      AuthorizedUserRoleTitle.SysAdmin,
      AuthorizedUserRoleTitle.Faculty,
    ];

    await withAuth(roles, jest.fn());

    expect(mockedRequireRole).toHaveBeenCalledWith(roles);
  });

  it("propagates a handler rejection", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: true,
      user: authUser({ id: 1 }),
    });
    const handler = jest.fn().mockRejectedValue(new Error("boom"));

    await expect(withAuth([], handler)).rejects.toThrow("boom");
  });
});

describe("assertOwner", () => {
  it("passes when the owner is given as a single number", () => {
    const user = authUser({ id: 7 });

    expect(assertOwner(7, user)).toEqual({ ok: true });
  });

  it("passes when the owner is in an array that also contains nulls", () => {
    const user = authUser({ id: 7 });

    expect(assertOwner([null, 7, undefined], user)).toEqual({ ok: true });
  });

  it("is forbidden for a non-owner", () => {
    const user = authUser({ id: 99 });

    expect(assertOwner([7], user)).toEqual({ ok: false, error: "forbidden" });
  });

  it("lets SysAdmin bypass ownership by default", () => {
    const user = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    expect(assertOwner([7], user)).toEqual({ ok: true });
  });

  it("does not let Faculty bypass ownership by default", () => {
    const user = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.Faculty],
    });

    expect(assertOwner([7], user)).toEqual({ ok: false, error: "forbidden" });
  });

  it("lets a caller bypass ownership when their role is in bypassRoles", () => {
    const user = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.Faculty],
    });

    expect(
      assertOwner([7], user, {
        bypassRoles: [AuthorizedUserRoleTitle.Faculty],
      }),
    ).toEqual({ ok: true });
  });

  it("is forbidden for a non-admin when ownerIds is undefined", () => {
    const user = authUser({ id: 99 });

    expect(assertOwner(undefined, user)).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("is forbidden for a non-admin when ownerIds is an empty array", () => {
    const user = authUser({ id: 99 });

    expect(assertOwner([], user)).toEqual({ ok: false, error: "forbidden" });
  });

  it("is ok for an admin when ownerIds is undefined", () => {
    const user = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    expect(assertOwner(undefined, user)).toEqual({ ok: true });
  });

  it("is ok for an admin when ownerIds is an empty array", () => {
    const user = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    expect(assertOwner([], user)).toEqual({ ok: true });
  });
});

describe("lib/auth/guards.ts", () => {
  it('does not start with a "use server" directive', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/auth/guards.ts"),
      "utf-8",
    );

    expect(source.trimStart().startsWith('"use server"')).toBe(false);
  });
});
