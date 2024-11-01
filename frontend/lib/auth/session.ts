import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}
