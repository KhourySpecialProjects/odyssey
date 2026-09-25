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

  it.each(
    Object.values(AuthorizedUserRoleTitle).filter(
      (role) => role !== AuthorizedUserRoleTitle.SysAdmin,
    ),
  )("does not let %s bypass ownership by default", (role) => {
    const user = authUser({ id: 99, roles: [role] });

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

  it("grants no bypass when bypassRoles is []", () => {
    const admin = authUser({
      id: 99,
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });
    expect(assertOwner([7], admin, { bypassRoles: [] })).toEqual({
      ok: false,
      error: "forbidden",
    });

    const owner = authUser({ id: 7 });
    expect(assertOwner([7], owner, { bypassRoles: [] })).toEqual({
      ok: true,
    });
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

/**
 * Detects a leading `"use server"` directive using the TypeScript parser, so
 * it isn't fooled by quote style or a leading comment before the directive.
 * Falls back to a regex if `typescript` can't be required under whatever
 * transform is running the test (e.g. a future SWC-based config). Kept as a
 * small local function — Task 6's AST guard test may reuse this idea.
 */
function hasUseServerDirective(source: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts = require("typescript") as typeof import("typescript");
    const sf = ts.createSourceFile(
      "scan.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const first = sf.statements[0];
    return (
      first !== undefined &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression) &&
      first.expression.text === "use server"
    );
  } catch {
    // `typescript` couldn't be imported under this transform — fall back to
    // a regex that tolerates leading comments and either quote style.
    return /^\s*(?:(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*['"]use server['"]/.test(
      source,
    );
  }
}

describe("lib/auth/guards.ts", () => {
  it('sanity check: the detector recognizes "use server" after a leading comment', () => {
    // If this ever returns false, the test below could pass for the wrong
    // reason (a broken detector that always returns false). Guard against
    // that by asserting the detector actually detects a real directive.
    expect(
      hasUseServerDirective("// c\n'use server';\nexport async function f(){}"),
    ).toBe(true);
  });

  it('does not start with a "use server" directive', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/auth/guards.ts"),
      "utf-8",
    );

    expect(hasUseServerDirective(source)).toBe(false);
  });
});
