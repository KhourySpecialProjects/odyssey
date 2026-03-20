import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "./options";
import { AuthorizedUserRoleTitle } from "../globals";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return undefined;

  // In development, allow role override via cookie for persona testing
  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    const override = cookieStore.get("dev-role-override")?.value;
    if (override) {
      try {
        const parsed = JSON.parse(override);
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
