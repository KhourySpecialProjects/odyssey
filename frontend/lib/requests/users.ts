"use server";

import { fetchContentCreators } from "@/lib/requests/authorized-user";
import { AuthorizedUser } from "@/types";

export async function fetchAllContentCreators(): Promise<AuthorizedUser[]> {
  return fetchContentCreators();
}
