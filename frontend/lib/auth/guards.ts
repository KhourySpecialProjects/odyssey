import { requireRole, type RequireRoleResult } from "@/lib/auth/require-role";
import {
  AuthorizedUserRoleTitle,
  AuthorizedUserAdminRoles,
} from "@/lib/globals";

/** The caller identity `requireRole` returns on success. */
export type AuthUser = Extract<RequireRoleResult, { ok: true }>["user"];

/** The shape `withAuth` returns when the gate denies the caller. */
export type AuthFailure = {
  ok: false;
  error: "unauthenticated" | "forbidden";
  data: null;
};

/**
 * Runs `requireRole` and, only on success, calls `handler` with the caller.
 *
 * @param roles   — the role titles allowed through, forwarded to
 *                  `requireRole` unchanged. Pass [] to only require an
 *                  authenticated session.
 * @param handler — runs with the gate's `AuthUser` when the caller passes.
 * @returns       — the handler's return value on success, or an
 *                  `AuthFailure` (`{ ok: false, error, data: null }`) on
 *                  failure, without calling the handler. Never throws
 *                  itself — a rejection from `handler` propagates as-is.
 *
 * Only for actions shaped `{ ok, error, data }`. Actions with other result
 * shapes should call `requireRole` directly and map `gate.error`.
 *
 * Because it goes through `requireRole`, it honors the dev-role-override
 * cookie in local dev (see `dev-role-override.ts`) automatically.
 *
 * Typical usage:
 *
 *   export async function foo(x: number) {
 *     return withAuth([], async (user) => {
 *       ...
 *     });
 *   }
 */
export async function withAuth<T>(
  roles: AuthorizedUserRoleTitle[],
  handler: (user: AuthUser) => Promise<T>,
): Promise<T | AuthFailure> {
  const gate = await requireRole(roles);
  if (!gate.ok) {
    return { ok: false, error: gate.error, data: null };
  }
  return handler(gate.user);
}

/**
 * Checks whether `user` owns the resource, or holds a bypass role.
 *
 * @param ownerIds — the resource's owner id(s). A single number, an array
 *                   (null/undefined entries are ignored), or null/undefined
 *                   for a resource with no owners.
 * @param user     — the caller, as returned by `requireRole`/`withAuth`.
 *                   Roles always come from the gate, never from the
 *                   session, so the dev-role-override applies here too.
 * @param opts.bypassRoles — roles that bypass the ownership check even when
 *                   the caller isn't an owner. Defaults to `[SysAdmin]`
 *                   (`AuthorizedUserAdminRoles`).
 * @returns        — `{ ok: true }` when `user.id` is among `ownerIds` or
 *                   `user.roles` includes a bypass role, otherwise
 *                   `{ ok: false, error: "forbidden" }`. Missing or empty
 *                   `ownerIds` are forbidden unless a bypass role applies.
 *                   Despite the name, it returns a result — it never
 *                   throws.
 *
 * Typical usage:
 *
 *   const owner = assertOwner(droplet?.authorized_users?.map((u) => u.id), user);
 *   if (!owner.ok) return { ok: false, error: owner.error, data: null };
 */
export function assertOwner(
  ownerIds: number | readonly (number | null | undefined)[] | null | undefined,
  user: AuthUser,
  opts?: { bypassRoles?: readonly AuthorizedUserRoleTitle[] },
): { ok: true } | { ok: false; error: "forbidden" } {
  const bypassRoles = opts?.bypassRoles ?? AuthorizedUserAdminRoles;
  if (bypassRoles.some((role) => user.roles.includes(role))) {
    return { ok: true };
  }

  const ids =
    ownerIds === null || ownerIds === undefined
      ? []
      : typeof ownerIds === "number"
        ? [ownerIds]
        : ownerIds;
  const isOwner = ids.some((id) => id != null && id === user.id);

  return isOwner ? { ok: true } : { ok: false, error: "forbidden" };
}
