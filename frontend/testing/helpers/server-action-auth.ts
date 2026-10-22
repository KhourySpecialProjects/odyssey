/**
 * Shared test pattern for Server Actions guarded by `requireRole`/`withAuth`.
 *
 * Usage:
 *   jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
 *   const mockedRequireRole = jest.mocked(requireRole);
 *
 *   describeServerActionAuth("togglePresentationEnabled", {
 *     requireRole: mockedRequireRole,
 *     invoke: () => togglePresentationEnabled(1, true),
 *     mutations: () => [global.fetch],
 *     denial: { kind: "owner", nonOwner: authFixtures.as({ id: 99 }) },
 *     authorized: {
 *       as: authFixtures.as({ id: 7 }),
 *       expect: (result) => expect(result.ok).toBe(true),
 *     },
 *     expectDenied: (result, code) =>
 *       expect(result).toEqual({ ok: false, error: code, data: null }),
 *   });
 *
 * This file is not named `*.test.*`, so Jest doesn't collect it as a test
 * suite on its own — it's only ever imported by other test files.
 *
 * A note on `arrange`: prefer `mockResolvedValue` over `mockResolvedValueOnce`
 * inside `denial.arrange` / `authorized.arrange`. `jest.clearAllMocks()`
 * (called before every generated `it`) resets call history but does **not**
 * drain queued `...Once` return values, so a value queued by an earlier test
 * can leak into a later one. If you need `...Once` semantics, reset the mock
 * yourself (e.g. `mock.mockReset()`) before queuing again.
 */
import type { requireRole, RequireRoleResult } from "@/lib/auth/require-role";
import type { AuthUser } from "@/lib/auth/guards";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

/** Canned `requireRole` results for the three standard auth test cases. */
export const authFixtures = {
  /** No session at all. */
  loggedOut(): RequireRoleResult {
    return { ok: false, error: "unauthenticated" };
  },
  /** Authenticated, but lacking an allowed role. */
  wrongRole(): RequireRoleResult {
    return { ok: false, error: "forbidden" };
  },
  /**
   * An authenticated caller with the given id. Defaults to
   * `user${id}@northeastern.edu` and no roles; override either via
   * `user`.
   */
  as(user: Partial<AuthUser> & { id: number }): RequireRoleResult {
    return {
      ok: true,
      user: {
        email: `user${user.id}@northeastern.edu`,
        roles: [],
        ...user,
      },
    };
  },
  /** A SysAdmin caller. Defaults to id 1. */
  admin(id: number = 1): RequireRoleResult {
    return authFixtures.as({
      id,
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });
  },
};

/**
 * The minimal shape `describeServerActionAuth` needs from a mutation mock —
 * anything with a jest-mock-shaped `.mock.calls`. Deliberately structural
 * (no `any`) so `global.fetch`'s mock (from `mockGlobalFetch()`) and a
 * `jest.mocked(revalidateTag)` handle both satisfy it without a cast.
 */
type MutationMock = { mock: { calls: readonly unknown[][] } };

/**
 * Generates the three standard auth test cases for a Server Action guarded
 * by `requireRole`/`withAuth`:
 *
 *   1. logged out → unauthenticated, no mutation runs;
 *   2. wrong role or non-owner → forbidden, no mutation runs;
 *   3. authorized caller → the action's own success assertion runs, and at
 *      least one mutation actually ran.
 *
 * Every case also asserts `requireRole`'s *first* call received the
 * expected roles (`toHaveBeenNthCalledWith(1, ...)`, not `toHaveBeenCalledWith`
 * — an action like `claimVoyageDropletNode` calls `requireRole` a second
 * time through a nested `withAuth`, and only the first call's roles reflect
 * this action's own gate).
 *
 * @param name — used to build the `describe` block title (`"${name} auth"`).
 * @param cfg.requireRole — the mocked `requireRole` used by the action
 *                  under test (or by `withAuth`, which calls it).
 * @param cfg.invoke     — calls the Server Action and returns its result.
 * @param cfg.mutations  — returns the jest mocks that perform the actual
 *                  mutation and any cache invalidation (e.g. `global.fetch`,
 *                  `jest.mocked(revalidateTag)`). Asserted to have 0 calls
 *                  in both denial cases, and at least one call across all of
 *                  them in the authorized case.
 * @param cfg.denial     — `{ kind: "role", roles }` for a plain role check,
 *                  or `{ kind: "owner", nonOwner, roles?, arrange? }` for an
 *                  ownership check, where `nonOwner` is the `requireRole`
 *                  result for a caller who isn't the owner. `roles` is the
 *                  roles the action's gate requires — defaults to `[]` for
 *                  `"owner"`, since ownership checks are usually behind
 *                  `withAuth([])`.
 * @param cfg.authorized — `as` is the `requireRole` result for the
 *                  authorized caller; `arrange` runs any additional setup
 *                  (e.g. mocking the resource lookup) before `invoke`;
 *                  `expect` asserts on the action's return value.
 * @param cfg.expectDenied — asserts a denied result matches the given
 *                  error code, for both denial cases.
 */
export function describeServerActionAuth<R>(
  name: string,
  cfg: {
    requireRole: jest.MockedFunction<typeof requireRole>;
    invoke: () => Promise<R>;
    mutations: () => ReadonlyArray<MutationMock>;
    denial:
      | { kind: "role"; roles: AuthorizedUserRoleTitle[] }
      | {
          kind: "owner";
          nonOwner: RequireRoleResult;
          roles?: AuthorizedUserRoleTitle[];
          arrange?: () => void | Promise<void>;
        };
    authorized: {
      as: RequireRoleResult;
      arrange?: () => void | Promise<void>;
      expect: (result: R) => void | Promise<void>;
    };
    expectDenied: (
      result: R,
      code: "unauthenticated" | "forbidden",
    ) => void | Promise<void>;
  },
): void {
  const expectedRoles =
    cfg.denial.kind === "role" ? cfg.denial.roles : cfg.denial.roles ?? [];

  describe(`${name} auth`, () => {
    it("denies a logged-out caller and runs no mutation", async () => {
      jest.clearAllMocks();
      cfg.requireRole.mockResolvedValue(authFixtures.loggedOut());

      const result = await cfg.invoke();

      await cfg.expectDenied(result, "unauthenticated");
      expect(cfg.requireRole).toHaveBeenNthCalledWith(1, expectedRoles);
      for (const mutation of cfg.mutations()) {
        expect(mutation.mock.calls).toHaveLength(0);
      }
    });

    it(
      cfg.denial.kind === "owner"
        ? "denies a non-owner and runs no mutation"
        : "denies the wrong role and runs no mutation",
      async () => {
        jest.clearAllMocks();
        if (cfg.denial.kind === "owner") {
          await cfg.denial.arrange?.();
          cfg.requireRole.mockResolvedValue(cfg.denial.nonOwner);
        } else {
          cfg.requireRole.mockResolvedValue(authFixtures.wrongRole());
        }

        const result = await cfg.invoke();

        await cfg.expectDenied(result, "forbidden");
        expect(cfg.requireRole).toHaveBeenNthCalledWith(1, expectedRoles);
        for (const mutation of cfg.mutations()) {
          expect(mutation.mock.calls).toHaveLength(0);
        }
      },
    );

    it("allows the authorized caller", async () => {
      jest.clearAllMocks();
      await cfg.authorized.arrange?.();
      cfg.requireRole.mockResolvedValue(cfg.authorized.as);

      const result = await cfg.invoke();

      await cfg.authorized.expect(result);
      expect(cfg.requireRole).toHaveBeenNthCalledWith(1, expectedRoles);
      // Prove the happy path actually did something — an authorized.expect
      // that only checks `result.ok` wouldn't catch a handler that was
      // silently skipped.
      expect(
        cfg.mutations().some((mutation) => mutation.mock.calls.length > 0),
      ).toBe(true);
    });
  });
}
