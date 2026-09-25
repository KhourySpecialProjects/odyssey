"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

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

    // This only writes the user's `playlists` relation (playlist.authorized_users).
    // - playlists: global, because the playlist page / explore derive
    //   "enrolled" from playlist.authorized_users in a shared cache entry.
    // - user(email): the cached record read above, so the next toggle sees
    //   the new state instead of a stale `playlists` list.
    // - userDashboard(id): this user's /dashboard playlists. Other users'
    //   dashboards don't include playlist.authorized_users.
    // No enrollment record changes, so the global enrollments sweep is not
    // needed (the per-user tag is kept as a cheap safety net).
    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.user(user.email));
    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    revalidateTag(CACHE_TAGS.userDashboard(authorizedUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error in togglePlaylistEnrollment:", error);
    return { success: false, error: "Failed to update enrollment" };
  }
}

export async function enrollInPlaylist(playlistId: number, userId: number) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            playlists: {
              connect: [playlistId],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update playlists");
    }
    // Same reasoning as togglePlaylistEnrollment: only this user's
    // `playlists` relation changes (playlists stays global because playlist
    // reads carry authorized_users).
    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.enrollments(userId));
    revalidateTag(CACHE_TAGS.userDashboard(userId));
    return { success: true };
  } catch (error) {
    console.error("Error updating playlists:", error);
    return { success: false, error: "Failed to enroll in playlist" };
  }
}
