"use server";

import { Announcement, AuthorizedUser, Droplet, Friendship } from "@/types";
import qs from "qs";
import { flattenAttributes, fetchAPI } from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Pre-computes the IDs needed for the feed query using fast, minimal queries
 * run in parallel, then queries announcements with simple $in filters
 * instead of deep nested relation joins.
 */
export async function fetchAnnouncements(
  user: AuthorizedUser,
  page?: number,
  roles?: string[],
  options?: { archived?: boolean },
): Promise<{
  data: Announcement[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}> {
  const archived = options?.archived ?? false;
  try {
    // Extract friend IDs from the user's friendships (already populated on authUser)
    const friendIds = (user.friendships || [])
      .flatMap((f: Friendship) =>
        (f.authorized_users || [])
          .filter((u) => u.id !== user.id)
          .map((u) => u.id),
      )
      .filter((id, i, arr) => arr.indexOf(id) === i);

    // Fetch group IDs, playlist IDs, and enrolled droplet IDs in parallel
    const [groupIds, playlistIds, enrolledDropletIds] = await Promise.all([
      fetchAPI<{ id: number }[]>("/groups", {
        urlParams: {
          filters: {
            $or: [
              { creator: { id: { $eq: user.id } } },
              { admins: { id: { $eq: user.id } } },
              { managers: { id: { $eq: user.id } } },
              { members: { id: { $eq: user.id } } },
            ],
          },
          fields: ["id"],
          pagination: { pageSize: 250, page: 1 },
        },
        next: { tags: [CACHE_TAGS.allGroups], revalidate: 900 },
      }).then((groups) => groups.map((g) => g.id)),
      fetchAPI<{ id: number }[]>("/playlists", {
        urlParams: {
          filters: {
            authorized_users: { id: { $eq: user.id } },
          },
          fields: ["id"],
          pagination: { pageSize: 250, page: 1 },
        },
        next: { tags: [CACHE_TAGS.playlists], revalidate: 900 },
      }).then((playlists) => playlists.map((p) => p.id)),
      fetchAPI<{ id: number; droplet?: { id: number } }[]>("/enrollments", {
        urlParams: {
          filters: {
            authorizedUser: { id: { $eq: user.id } },
          },
          fields: ["id"],
          populate: { droplet: { fields: ["id"] } },
          pagination: { pageSize: 250, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.enrollments(user.id), CACHE_TAGS.allEnrollments],
          revalidate: 900,
        },
      }).then((enrollments) =>
        enrollments
          .map((e) => e.droplet?.id)
          .filter((id): id is number => id != null),
      ),
    ]);

    // Build the query with simple $in filters instead of nested relation joins
    const orFilters: any[] = [];

    if (groupIds.length > 0) {
      orFilters.push({ group: { id: { $in: groupIds } } });
    }
    if (playlistIds.length > 0) {
      orFilters.push({ playlist: { id: { $in: playlistIds } } });
    }
    if (friendIds.length > 0) {
      orFilters.push({
        type: "friend",
        authorized_user: { id: { $in: friendIds } },
      });
      orFilters.push({
        type: "kudos",
        authorized_user: { id: { $in: friendIds } },
      });
    }
    if (enrolledDropletIds.length > 0) {
      orFilters.push({
        type: "droplet",
        droplet: { id: { $in: enrolledDropletIds } },
      });
    }
    // System announcements: global (no user) or targeted at this user
    orFilters.push({
      type: "system",
      $or: [
        { authorized_user: { id: { $null: true } } },
        { authorized_user: { id: { $eq: user.id } } },
      ],
    });

    const readAtFilter = archived
      ? { readAt: { $notNull: true } }
      : { readAt: { $null: true } };

    const baseFilters = {
      $and: [{ $or: orFilters }, readAtFilter],
    };

    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      fields: ["id", "type", "content", "firstCreated", "readAt"],
      filters: roles?.length
        ? {
            $and: [{ $or: orFilters }, readAtFilter, { type: { $in: roles } }],
          }
        : baseFilters,
      populate: {
        authorized_user: {
          fields: [
            "id",
            "email",
            "firstName",
            "lastName",
            "bio",
            "github",
            "linkedin",
            "profilePhoto",
            "isPublic",
            "website",
          ],
          populate: {
            blocked: { fields: ["id"] },
            was_blocked: { fields: ["id"] },
          },
        },
        kudosGiven: {
          fields: [
            "id",
            "email",
            "firstName",
            "lastName",
            "bio",
            "github",
            "linkedin",
            "profilePhoto",
            "website",
          ],
          populate: {
            blocked: { fields: ["id"] },
            was_blocked: { fields: ["id"] },
          },
        },
        playlist: {
          fields: ["id", "name", "slug", "description", "isPublic"],
          populate: {
            droplets: {
              fields: ["id", "name", "slug"],
              populate: {
                lessons: {
                  fields: ["id", "name", "slug"],
                },
              },
            },
          },
        },
        droplet: {
          fields: ["id", "name", "description", "slug"],
        },
        group: {
          fields: ["id", "groupName", "description", "slug"],
        },
      },
      pagination: {
        pageSize: 25,
        page: page || 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: [CACHE_TAGS.announcements], revalidate: 900 },
      },
    );
    if (!response.ok) {
      throw new Error(`Strapi returned ${response.status} for /announcements`);
    }
    const data = await response.json();
    const flattened = flattenAttributes(data.data);
    return {
      data: Array.isArray(flattened) ? flattened : [],
      pagination: data.meta?.pagination ?? {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 0,
      },
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch announcement data.");
  }
}

export async function createFriendAnnouncement(
  droplet: Droplet,
  user: AuthorizedUser,
) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: user.id,
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has completed ${droplet.name}.`,
            firstCreated: curDate,
            droplet: droplet.id,
            type: "friend",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createKudosAnnouncement(
  user: AuthorizedUser,
  announcementId: number,
  droplet: Droplet,
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/announcements/${announcementId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            kudosGiven: {
              connect: [user],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update kudos status");
    }
  } catch (error) {
    console.error("Error updating kudos:", error);
    throw error;
  }
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: user.id,
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has given you kudos for completing ${droplet.name}`,
            droplet: droplet.id,
            firstCreated: curDate,
            type: "kudos",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createPlaylistAnnouncement(
  playlistName: string,
  id: number,
) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            playlist: id,
            content: `${playlistName} has been updated. Click to view this playlist!`,
            firstCreated: curDate,
            type: "playlist",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createGroupAnnouncement(groupName: string, id: number) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            group: id,
            content: `${groupName} has been updated. Click to view this group!`,
            firstCreated: curDate,
            type: "group",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createDropletAnnouncement(name: string, id: number) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            droplet: id,
            content: `${name} has been updated. Click to view this droplet!`,
            firstCreated: curDate,
            type: "droplet",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createSystemAnnouncement(
  content: string,
  authUser: AuthorizedUser,
) {
  // Defensive guard: refuse to create an orphaned announcement (one with no
  // authorized_user). Orphans are broadcast to every user's feed, so a bad
  // call here would show duplicate system messages to the entire platform.
  // TypeScript guarantees the signature, but we've had runtime cases where
  // the caller passed a partially-hydrated user object with id=undefined.
  if (!authUser?.id) {
    console.error("createSystemAnnouncement: refusing to create orphan", {
      content,
      authUser,
    });
    return {
      success: false,
      error: "Invalid authUser — announcement not created",
    };
  }

  try {
    // Skip if this exact system announcement already exists for this user
    const existing = await fetchAPI<{ id: number }[]>("/announcements", {
      urlParams: {
        filters: {
          $and: [
            { authorized_user: { id: { $eq: authUser.id } } },
            { type: { $eq: "system" } },
            { content: { $eq: content } },
          ],
        },
        fields: ["id"],
        pagination: { pageSize: 1, page: 1 },
      },
      cache: "no-store",
    });
    if (existing.length > 0) {
      return { success: true };
    }

    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: authUser.id,
            content: content,
            firstCreated: curDate,
            type: "system",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

/**
 * Create a system announcement broadcast to ALL users.
 * Unlike createSystemAnnouncement (which targets a single user), this one
 * creates a record with authorized_user = null, which the feed query
 * treats as globally visible.
 *
 * Admin-only.
 */
export async function createSystemBroadcast(content: string) {
  // Gate first — don't leak existence/validation details to non-admins.
  const gate = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);
  if (!gate.ok) {
    return { success: false, error: "Unauthorized" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Content is required" };
  }
  if (trimmed.length > 1000) {
    return { success: false, error: "Content is too long (max 1000 chars)" };
  }

  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: trimmed,
            firstCreated: new Date().toISOString(),
            type: "system",
            // authorized_user intentionally omitted → null → broadcast
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("createSystemBroadcast failed:", await response.text());
      return { success: false, error: "Failed to create broadcast" };
    }

    revalidateTag(CACHE_TAGS.announcements);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error creating broadcast:", error);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Mark an announcement as read — sets its readAt timestamp so it
 * disappears from the Unread feed and shows in Read.
 * Idempotent: re-marking an already-read announcement refreshes readAt.
 */
export async function markAnnouncementRead(id: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/announcements/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          data: { readAt: new Date().toISOString() },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to mark announcement as read (${response.status})`,
      );
    }
    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    return { success: false, error };
  }
}

/**
 * Mark an announcement as unread — clears its readAt so it shows in
 * the Unread feed again.
 */
export async function markAnnouncementUnread(id: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/announcements/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          data: { readAt: null },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to mark announcement as unread (${response.status})`,
      );
    }
    revalidateTag(CACHE_TAGS.announcements);
    return { success: true };
  } catch (error) {
    console.error("Error marking announcement as unread:", error);
    return { success: false, error };
  }
}

/**
 * Count unread (non-archived) announcements for the current user.
 * Used for the nav badge.
 */
export async function getUnreadAnnouncementCount(
  user: AuthorizedUser,
): Promise<number> {
  try {
    const { pagination } = await fetchAnnouncements(user, 1, undefined, {
      archived: false,
    });
    return pagination.total;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
}

export async function fetchAnnouncementById(id: number) {
  try {
    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      filters: {
        id: { $eq: id },
      },
      populate: {
        authorized_users: {
          fields: [
            "id",
            "email",
            "firstName",
            "lastName",
            "bio",
            "github",
            "linkedin",
            "profilePhoto",
            "website",
          ],
          populate: {
            blocked: {
              fields: ["id"],
            },
            was_blocked: {
              fields: ["id"],
            },
          },
        },
        playlist: {
          fields: ["id", "name", "slug", "description", "isPublic"],
          populate: {
            droplets: {
              fields: ["id", "name", "slug"],
              populate: {
                lessons: {
                  fields: ["id", "name", "slug"],
                },
              },
            },
          },
        },
        droplet: {
          fields: ["id", "name", "slug"],
        },
        group: {
          fields: ["id", "name", "slug"],
        },
      },
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: [CACHE_TAGS.announcements], revalidate: 900 },
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch announcement data.");
  }
}

export async function fetchUserAnnouncements(
  userId: number,
  page?: number,
): Promise<Announcement[]> {
  try {
    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      filters: {
        authorized_user: {
          id: { $eq: userId },
        },
        type: {
          $in: ["friend", "kudos", "droplet"],
        },
      },
      populate: {
        authorized_user: {
          fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
          populate: {
            blocked: { fields: ["id"] },
            was_blocked: { fields: ["id"] },
          },
        },
        kudosGiven: {
          fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
        },
        droplet: {
          fields: ["id", "name", "slug"],
        },
      },
      pagination: {
        pageSize: 10,
        page: page || 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: [CACHE_TAGS.announcements], revalidate: 900 },
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user announcements.");
  }
}
