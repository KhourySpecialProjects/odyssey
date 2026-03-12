import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  return session?.user;
});
