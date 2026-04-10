import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

export type RequireRoleResult =
  | {
      ok: true;
      user: { email: string; id: number; roles: AuthorizedUserRoleTitle[] };
    }
  | { ok: false; error: "unauthenticated" | "forbidden" };

/**
 * Guard for Server Actions.
 *
 * @param allowed — one or more role titles the caller must have. Pass [] to
 *                  only require an authenticated session (no role gate).
 * @returns       — { ok: true, user } with the caller's Strapi id + roles, or
 *                  { ok: false, error } with the reason. Never throws.
 *
 * Typical usage:
 *
 *   const gate = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);
 *   if (!gate.ok) return { ok: false, error: gate.error, data: null };
 *   const { user } = gate;
 */
export async function requireRole(
  allowed: AuthorizedUserRoleTitle[],
): Promise<RequireRoleResult> {
  // Step 1: Get the session. If no email, caller is unauthenticated.
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.email) {
    return { ok: false, error: "unauthenticated" };
  }

  // Step 2: Resolve the authorized user from Strapi.
  const user = await getCachedUser(sessionUser.email);
  if (!user?.id) {
    return { ok: false, error: "unauthenticated" };
  }

  // Step 3: Extract role titles. Roles can be strings or objects with .title
  // (same pattern as requireAdminOrFaculty in voyage.ts:17-20).
  const roleTitles: AuthorizedUserRoleTitle[] = (user.roles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) =>
      (typeof r === "string" ? r : r.title) as AuthorizedUserRoleTitle,
  );

  // Step 4: Empty allowed array means "any authenticated user".
  if (allowed.length === 0) {
    return {
      ok: true,
      user: { id: user.id, email: sessionUser.email, roles: roleTitles },
    };
  }

  // Step 5: Check if any of the user's roles intersect with the allowed set.
  const hasRole = roleTitles.some((title) => allowed.includes(title));
  if (hasRole) {
    return {
      ok: true,
      user: { id: user.id, email: sessionUser.email, roles: roleTitles },
    };
  }

  // Step 6: Authenticated but not permitted.
  return { ok: false, error: "forbidden" };
}
