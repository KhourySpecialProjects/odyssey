"use server";

import { createKudosAnnouncement } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound } from "next/navigation";

export async function giveKudos(announcementId: number, droplet: string) {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(user.email);

  try {
    return await createKudosAnnouncement(authUser, announcementId, droplet);
  } catch (error) {
    console.error("Failed to give kudos: ", error);
    return { success: false, error };
  }
}
