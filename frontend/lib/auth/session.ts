import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "./options";
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
 * their local .env. See ODY-409 for context.
 *
 * Exported so it can be unit-tested in isolation.
 */
export function isDevRoleOverrideEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.ENABLE_DEV_ROLE_OVERRIDE !== "true") return false;
  return true;
}

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return undefined;

  // In development, allow role override via cookie for persona testing.
  // Requires BOTH NODE_ENV=development AND ENABLE_DEV_ROLE_OVERRIDE=true.
  if (isDevRoleOverrideEnabled()) {
    const cookieStore = await cookies();
    const override = cookieStore.get("dev-role-override")?.value;
    if (override) {
      try {
        const parsed = JSON.parse(decodeURIComponent(override));
        const validValues = Object.values(AuthorizedUserRoleTitle) as string[];
        if (Array.isArray(parsed)) {
          const roles = parsed.filter((r) =>
            validValues.includes(r),
          ) as AuthorizedUserRoleTitle[];
          if (roles.length > 0) return { ...session.user, roles };
        }
      } catch {
        // Invalid cookie value, ignore
      }
    }
  }

  return session.user;
});
