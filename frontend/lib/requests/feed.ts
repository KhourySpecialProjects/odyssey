"use server";

import { Announcement, AuthorizedUser, Droplet, Friendship } from "@/types";
import qs from "qs";
import {
  flattenAttributes,
  fetchAPI,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  earliestDue,
  reminderHeadline,
  reminderProgress,
} from "@/lib/reminder-progress";
import { templateState } from "@/lib/reminder-rules";
import {
  FILTER_VALUES,
  toFeedRoles,
} from "@/components/feed/feed-filter-params";
import { getCurrentUser } from "../auth/session";
import { getAuthorizedUserId } from "../auth/current-user-id";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getCachedUserSocial } from "./cached";
import { resolveDocumentId, strapiEntryUrl } from "../strapi-document-id";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export type FeedPage = {
  data: Announcement[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
};

function friendIdsOf(
  userId: number,
  friendships: Friendship[] | undefined,
): number[] {
  return (friendships || [])
    .flatMap((f) =>
      (f.authorized_users || [])
        .filter((u) => u.id !== userId)
        .map((u) => u.id),
    )
    .filter((id, i, arr) => arr.indexOf(id) === i);
}

/**
 * Which announcements the viewer's feed includes, as a Strapi `$or` filter.
 * Shared by the feed, the nav count and the read/unread check, so a user can
 * mark read exactly the cards they can see.
 *
 * Pre-computes the IDs needed using fast, minimal queries run in parallel, so
 * the announcements query needs only simple $in filters, not nested joins.
 */
async function buildVisibilityFilters(
  userId: number,
  email: string,
): Promise<any[]> {
  // Fetch group IDs, playlist IDs, enrolled droplet IDs, and friend IDs in
  // parallel. Friends come from the social graph the activity layout already
  // reads (request-deduped there; a Data Cache hit from a Server Action).
  const [groupIds, playlistIds, enrolledDropletIds, friendIds] =
    await Promise.all([
      fetchAPI<{ id: number }[]>("/groups", {
        urlParams: {
          filters: {
            $or: [
              { creator: { id: { $eq: userId } } },
              { admins: { id: { $eq: userId } } },
              { managers: { id: { $eq: userId } } },
              { members: { id: { $eq: userId } } },
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
            authorized_users: { id: { $eq: userId } },
          },
          fields: ["id"],
          pagination: { pageSize: 250, page: 1 },
        },
        next: { tags: [CACHE_TAGS.playlists], revalidate: 900 },
      }).then((playlists) => playlists.map((p) => p.id)),
      fetchAPI<{ id: number; droplet?: { id: number } }[]>("/enrollments", {
        urlParams: {
          filters: {
            authorizedUser: { id: { $eq: userId } },
          },
          fields: ["id"],
          populate: { droplet: { fields: ["id"] } },
          pagination: { pageSize: 250, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.enrollments(userId), CACHE_TAGS.allEnrollments],
          revalidate: 900,
        },
      }).then((enrollments) =>
        enrollments
          .map((e) => e.droplet?.id)
          .filter((id): id is number => id != null),
      ),
      getCachedUserSocial(email).then((social) =>
        friendIdsOf(userId, social?.friendships),
      ),
    ]);

  const orFilters: any[] = [];

  if (groupIds.length > 0) {
    orFilters.push({
      group: { id: { $in: groupIds } },
      type: { $ne: "reminder" },
    });
  }
  if (playlistIds.length > 0) {
    orFilters.push({
      playlist: { id: { $in: playlistIds } },
      type: { $ne: "reminder" },
    });
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
      { authorized_user: { id: { $eq: userId } } },
    ],
  });

  // Review outcomes reach only the recipient
  orFilters.push({
    type: { $in: ["review_feedback", "review_published"] },
    authorized_user: { id: { $eq: userId } },
  });

  // Reminders reach only their owner
  orFilters.push({
    type: "reminder",
    authorized_user: { id: { $eq: userId } },
  });
  return orFilters;
}

/**
 * The feed's query: visible rows in the viewer's own read state, of `types`.
 * Shared by the feed page and the nav count so the two can't drift.
 */
async function buildFeedQuery(
  userId: number,
  email: string,
  opts: { archived: boolean; types?: string[] },
) {
  const { archived, types } = opts;
  const orFilters = await buildVisibilityFilters(userId, email);
  // Read state is per user (announcement-reads), never the shared row. Strapi
  // drops the user's read rows for unreadBy, so the URL never grows with them.
  return {
    filters: {
      $and: [
        { $or: orFilters },
        ...(archived
          ? [{ reads: { authorized_user: { id: { $eq: userId } } } }]
          : []),
        ...(types?.length ? [{ type: { $in: types } }] : []),
      ],
    },
    ...(archived ? {} : { unreadBy: userId }),
  };
}

/**
 * The signed-in user's feed. Callable from the client as a Server Action, so
 * the viewer always comes from the session — never from arguments.
 *
 * Pre-computes the IDs needed for the feed query using fast, minimal queries
 * run in parallel, then queries announcements with simple $in filters
 * instead of deep nested relation joins.
 */
export async function fetchAnnouncements(
  page?: number,
  roles?: string[],
  options?: { archived?: boolean },
): Promise<FeedPage> {
  const archived = options?.archived ?? false;
  const sessionUser = await getCurrentUser();
  const userId = await getAuthorizedUserId(sessionUser);
  if (!sessionUser?.email || !userId) {
    throw new Error("Not authenticated");
  }
  const email = sessionUser.email;
  // Arguments arrive from the client unchecked.
  const pageNumber =
    typeof page === "number" && Number.isInteger(page) && page > 0 ? page : 1;
  const types = Array.isArray(roles)
    ? roles.filter((r) => typeof r === "string")
    : undefined;
  try {
    const feedQuery = await buildFeedQuery(userId, email, {
      archived,
      types,
    });

    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      fields: ["id", "type", "content", "firstCreated"],
      ...feedQuery,
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
        page: pageNumber,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: {
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        // Two-level: new announcements sweep the global tag; a user's own
        // read-state changes use userFeed(id).
        next: {
          tags: [CACHE_TAGS.announcements, CACHE_TAGS.userFeed(userId)],
          revalidate: 900,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Strapi returned ${response.status} for /announcements`);
    }
    const data = await response.json();
    const flattened = flattenAttributes(data.data);
    const rows: Announcement[] = Array.isArray(flattened) ? flattened : [];
    return {
      data: await attachReminderData(rows, userId, email),
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

type LessonRef = { id: number; name: string; slug: string; orderIndex: number };

/** Adds progress, Up next, due date and headline to the viewer's reminders. */
async function attachReminderData(
  rows: Announcement[],
  userId: number,
  email: string,
): Promise<Announcement[]> {
  const reminders = rows.filter((r) => r.type === "reminder");
  if (reminders.length === 0) return rows;
  const dropletIds = [
    ...new Set(reminders.map((r) => r.droplet?.id).filter((id) => id != null)),
  ] as number[];

  let enrollments: {
    droplet?: { id: number; lessons?: LessonRef[] };
    viewedLessons?: { id: number }[];
    lastProgressDate?: string | null;
    createdAt?: string;
  }[] = [];
  let dueRows: {
    dueDate: string;
    droplet?: { id: number };
    group?: { groupName?: string };
  }[] = [];
  let timeZone: string | null | undefined;
  try {
    [enrollments, dueRows, timeZone] = await Promise.all([
      fetchAPI<typeof enrollments>("/enrollments", {
        urlParams: {
          filters: {
            authorizedUser: { id: { $eq: userId } },
            droplet: { id: { $in: dropletIds } },
          },
          fields: ["id", "lastProgressDate", "createdAt"],
          populate: {
            viewedLessons: { fields: ["id"] },
            droplet: {
              fields: ["id"],
              populate: {
                lessons: { fields: ["id", "name", "slug", "orderIndex"] },
              },
            },
          },
          pagination: { pageSize: 250, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.enrollments(userId), CACHE_TAGS.droplets],
          revalidate: 900,
        },
      }),
      // Only rows with a droplet; playlist due dates are ignored for now
      fetchAPI<typeof dueRows>("/due-dates", {
        urlParams: {
          filters: {
            authorized_user: { id: { $eq: userId } },
            droplet: { id: { $in: dropletIds } },
            dueDate: { $notNull: true },
          },
          sort: ["dueDate:asc"],
          fields: ["dueDate"],
          populate: {
            droplet: { fields: ["id"] },
            group: { fields: ["groupName"] },
          },
          pagination: { pageSize: 250, page: 1 },
        },
        next: { tags: [CACHE_TAGS.allDueDates], revalidate: 900 },
      }),
      // A failed lookup falls back to Boston rather than failing the feed
      getAuthorizedUserByEmail<Pick<AuthorizedUser, "id" | "timeZone">>(email, {
        fields: ["id", "timeZone"],
      })
        .then((u) => u?.timeZone)
        .catch(() => null),
    ]);
  } catch (error) {
    // The cards still render, just without progress or a due date
    console.error("Error loading reminder progress:", error);
  }

  const now = new Date();

  return rows.map((row) => {
    if (row.type !== "reminder") return row;
    const name = row.droplet?.name ?? "this droplet";
    const enrollment = enrollments.find(
      (e) => e.droplet?.id === row.droplet?.id,
    );
    const computed = enrollment
      ? reminderProgress(
          enrollment.droplet?.lessons ?? [],
          (enrollment.viewedLessons ?? []).map((l) => l.id),
        )
      : { progress: null, nextLesson: null, started: false };
    const due = earliestDue(
      dueRows.filter((d) => d.droplet?.id === row.droplet?.id),
    );
    const headline = reminderHeadline(
      name,
      templateState(
        {
          progress: computed.progress,
          started: computed.started,
          idleFrom:
            enrollment?.lastProgressDate ?? enrollment?.createdAt ?? null,
          dueDate: due?.dueDate ?? null,
          enrolledAt: enrollment?.createdAt ?? null,
        },
        now,
        timeZone,
      ),
    );
    return {
      ...row,
      reminder: {
        ...computed,
        headline,
        ...due,
      },
    };
  });
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
            authorized_user: await resolveDocumentId(
              "authorized-users",
              user.id,
            ),
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has completed ${droplet.name}.`,
            firstCreated: curDate,
            droplet: await resolveDocumentId("droplets", droplet.id),
            type: "friend",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
      await strapiEntryUrl("announcements", announcementId),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        body: JSON.stringify({
          data: {
            kudosGiven: {
              connect: [await resolveDocumentId("authorized-users", user.id)],
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
            authorized_user: await resolveDocumentId(
              "authorized-users",
              user.id,
            ),
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has given you kudos for completing ${droplet.name}`,
            droplet: await resolveDocumentId("droplets", droplet.id),
            firstCreated: curDate,
            type: "kudos",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
            playlist: await resolveDocumentId("playlists", id),
            content: `${playlistName} has been updated. Click to view this playlist!`,
            firstCreated: curDate,
            type: "playlist",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
            group: await resolveDocumentId("groups", id),
            content: `${groupName} has been updated. Click to view this group!`,
            firstCreated: curDate,
            type: "group",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
            droplet: await resolveDocumentId("droplets", id),
            content: `${name} has been updated. Click to view this droplet!`,
            firstCreated: curDate,
            type: "droplet",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
            authorized_user: await resolveDocumentId(
              "authorized-users",
              authUser.id,
            ),
            content: content,
            firstCreated: curDate,
            type: "system",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
 * Mark an announcement as read for the signed-in user only: adds a row to
 * announcement-reads, so it leaves their Unread feed and shows in Read.
 * Idempotent: an already-read announcement is left as it is.
 */
export async function markAnnouncementRead(id: number) {
  return setReadState(id, true);
}

/**
 * Mark an announcement as unread for the signed-in user only: removes their
 * read rows so it shows in the Unread feed again.
 */
export async function markAnnouncementUnread(id: number) {
  return setReadState(id, false);
}

async function setReadState(
  id: number,
  read: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await assertAnnouncementVisible(id);
    if (!access.ok) return { success: false, error: access.error };

    const existing = await fetchAPI<{ id: number; documentId?: string }[]>(
      "/announcement-reads",
      {
        urlParams: {
          filters: {
            announcement: { id: { $eq: id } },
            authorized_user: { id: { $eq: access.userId } },
          },
          fields: ["id"],
          pagination: { pageSize: 25, page: 1 },
        },
        cache: "no-store",
      },
    );

    if (read && existing.length === 0) {
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/announcement-reads",
        {
          method: "POST",
          body: JSON.stringify({
            data: {
              announcement: access.documentId,
              authorized_user: await resolveDocumentId(
                "authorized-users",
                access.userId,
              ),
            },
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          `Failed to mark announcement as read (${response.status})`,
        );
      }
    }

    if (!read) {
      for (const row of existing) {
        const response = await fetch(
          await strapiEntryUrl("announcement-reads", row),
          {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
              ...STRAPI_RESPONSE_FORMAT_HEADER,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to mark announcement as unread (${response.status})`,
          );
        }
      }
    }

    // Read state is per user, so only this user's feed changes.
    revalidateTag(CACHE_TAGS.userFeed(access.userId));
    return { success: true };
  } catch (error) {
    console.error("Error changing announcement read state:", error);
    return {
      success: false,
      error: `Failed to mark as ${read ? "read" : "unread"}`,
    };
  }
}

/**
 * Confirms the announcement is in the signed-in user's feed, by the same
 * rules as fetchAnnouncements. Nobody can mark a card they cannot see, and
 * the viewer always comes from the session.
 */
async function assertAnnouncementVisible(
  id: number,
): Promise<
  | { ok: true; userId: number; documentId: string }
  | { ok: false; error: string }
> {
  const sessionUser = await getCurrentUser();
  const userId = await getAuthorizedUserId(sessionUser);
  if (!sessionUser?.email || !userId) {
    return { ok: false, error: "Not authenticated" };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Announcement not found" };
  }

  const orFilters = await buildVisibilityFilters(userId, sessionUser.email);
  // Filter the list endpoint by id: single-entry routes need a documentId, and
  // this needs no lookup.
  const [announcement] = await fetchAPI<{ id: number; documentId?: string }[]>(
    "/announcements",
    {
      urlParams: {
        filters: { $and: [{ id: { $eq: id } }, { $or: orFilters }] },
        fields: ["id"],
        pagination: { pageSize: 1, page: 1 },
      },
      cache: "no-store",
    },
  );

  if (!announcement?.documentId) {
    return { ok: false, error: "Announcement not found" };
  }
  return { ok: true, userId, documentId: announcement.documentId };
}

/**
 * The nav badge: unread rows of `roles` (default: the Unread tab's types).
 * Read state is per user, so it matches the Unread tab, broadcasts included.
 */
export async function getUnreadAnnouncementCount(
  roles?: string[],
): Promise<number | null> {
  try {
    const types = Array.isArray(roles) ? roles : toFeedRoles(FILTER_VALUES);
    // The shared filters treat no types as "all", but the tab shows nothing
    if (types.length === 0) return 0;
    const sessionUser = await getCurrentUser();
    const userId = await getAuthorizedUserId(sessionUser);
    if (!sessionUser?.email || !userId) throw new Error("Not authenticated");
    const feedQuery = await buildFeedQuery(userId, sessionUser.email, {
      archived: false,
      types: types.filter((t) => typeof t === "string"),
    });
    const data = await fetchAPI<{ meta?: { pagination?: { total?: number } } }>(
      "/announcements",
      {
        urlParams: {
          ...feedQuery,
          fields: ["id"],
          pagination: { pageSize: 1, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.announcements, CACHE_TAGS.userFeed(userId)],
          revalidate: 900,
        },
        flattenResponse: false,
      },
    );
    return data.meta?.pagination?.total ?? 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    // null = unknown, so callers keep what they show instead of hiding it
    return null;
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
          fields: ["id", "slug"],
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
        headers: {
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
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
        headers: {
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
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
