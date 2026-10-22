import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";
import { getDevRoleOverride } from "./dev-role-override";

export { isDevRoleOverrideEnabled } from "./dev-role-override";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return undefined;

  // In development, allow role override via cookie for persona testing.
  // Requires BOTH NODE_ENV=development AND ENABLE_DEV_ROLE_OVERRIDE=true.
  // See dev-role-override.ts for the cookie parsing and both env gates.
  const override = await getDevRoleOverride();
  if (override) return { ...session.user, roles: override };

  return session.user;
});
