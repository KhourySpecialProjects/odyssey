import { User } from "@/types";
import { getCachedUser } from "@/lib/requests/cached";

/**
 * Resolves the signed-in user's Strapi authorized-user id.
 *
 * The id is read from the session token, so id-keyed fetches can start in
 * parallel with everything else. Tokens issued before the id was added fall
 * back to the (request-deduplicated) lookup by email until the user signs in
 * again.
 */
export async function getAuthorizedUserId(
  user: User | undefined,
): Promise<number | undefined> {
  if (user?.id) return user.id;
  if (!user?.email) return undefined;
  return (await getCachedUser(user.email))?.id;
}
