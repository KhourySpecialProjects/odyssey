"use server";

import { fetchContentCreators } from "@/lib/requests/authorized-user";
import { AuthorizedUser } from "@/types";

/**
 * Retrieves a list of all authorized content creators.
 *
 * @returns A promise that resolves to an array of `AuthorizedUser` objects representing content creators.
 */
export async function fetchAllContentCreators(): Promise<AuthorizedUser[]> {
  return fetchContentCreators();
}
