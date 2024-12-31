"use server";

import { getAllAuthorizedUsers } from "@/lib/requests/authorized-user";
import { AuthorizedUser } from "@/types";

export async function fetchAllUsers(): Promise<AuthorizedUser[]> {
  return getAllAuthorizedUsers();
}
