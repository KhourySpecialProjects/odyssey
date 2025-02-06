"use server";

import { createKudosAnnouncement } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { redirect } from "next/navigation";

export async function giveKudos() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return redirect("/");
  const authUser = await getAuthorizedUserByEmail(user.email);

  try {
    return await createKudosAnnouncement(authUser);
  } catch (error) {
    console.error("Failed to give kudos: ", error);
    return { success: false, error };
  }
}
