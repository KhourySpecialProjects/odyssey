import { cookies } from "next/headers";
import { AuthorizedUserRoleTitle } from "../globals";

/**
 * Defense-in-depth gate for the dev-role-override cookie feature.
 *
 * Both conditions must be true to enable role impersonation:
 *   1. NODE_ENV === "development" (the existing weak gate)
 *   2. ENABLE_DEV_ROLE_OVERRIDE === "true" (explicit opt-in flag)
 *
 * The explicit flag prevents accidental activation in staging environments
 * that may have NODE_ENV=development set incorrectly. Developers who use
 * the role switcher locally must add ENABLE_DEV_ROLE_OVERRIDE=true to
 * their local .env.
 *
 * Exported so it can be unit-tested in isolation.
 */
export function isDevRoleOverrideEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.ENABLE_DEV_ROLE_OVERRIDE !== "true") return false;
  return true;
}

/**
 * Returns the valid override roles from the dev-role-override cookie, or
 * null when the override is disabled, absent, malformed, or contains no
 * valid roles. Never throws.
 */
export async function getDevRoleOverride(): Promise<
  AuthorizedUserRoleTitle[] | null
> {
  if (!isDevRoleOverrideEnabled()) return null;

  try {
    const cookieStore = await cookies();
    const override = cookieStore.get("dev-role-override")?.value;
    if (!override) return null;

    const parsed = JSON.parse(decodeURIComponent(override));
    const validValues = Object.values(AuthorizedUserRoleTitle) as string[];
    if (!Array.isArray(parsed)) return null;

    const roles = parsed.filter((r) =>
      validValues.includes(r),
    ) as AuthorizedUserRoleTitle[];
    return roles.length > 0 ? roles : null;
  } catch {
    // Invalid cookie value, or cookies() threw. Ignore either way.
    return null;
  }
}
