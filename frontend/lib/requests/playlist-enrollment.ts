"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidatePath } from "next/cache";

interface PlaylistWithId {
  id: number;
}

export async function togglePlaylistEnrollment(playlistId: number) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const authorizedUser = await getAuthorizedUserByEmail(user.email, {
      populate: {
        playlists: {
          fields: ["id"],
        },
      },
    });

    const isEnrolled = authorizedUser.playlists?.some(
      (p: PlaylistWithId) => p.id === playlistId,
    );

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${authorizedUser.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            playlists: {
              [isEnrolled ? "disconnect" : "connect"]: [playlistId],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update enrollment");
    }

    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dashboard", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in togglePlaylistEnrollment:", error);
    return { success: false, error: "Failed to update enrollment" };
  }
}
