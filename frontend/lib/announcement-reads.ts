import "server-only";
import { resolveDocumentId, strapiEntryUrl } from "@/lib/strapi-document-id";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

// Per-user read rows (ODY-786). Not a "use server" file: callers check access first.

/** Adds (read) or removes (unread) the user's read rows for an announcement. True if anything changed; throws on failure. */
export async function writeAnnouncementRead(
  announcement: { id: number; documentId: string },
  userId: number,
  read: boolean,
): Promise<boolean> {
  const existing = await fetchAPI<{ id: number; documentId?: string }[]>(
    "/announcement-reads",
    {
      urlParams: {
        filters: {
          announcement: { id: { $eq: announcement.id } },
          authorized_user: { id: { $eq: userId } },
        },
        fields: ["id"],
        pagination: { pageSize: 25, page: 1 },
      },
      cache: "no-store",
    },
  );

  if (read) {
    if (existing.length > 0) return false;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/announcement-reads`,
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            announcement: announcement.documentId,
            authorized_user: await resolveDocumentId(
              "authorized-users",
              userId,
            ),
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to mark announcement as read (${response.status})`,
      );
    }
    return true;
  }

  for (const row of existing) {
    const response = await fetch(
      await strapiEntryUrl("announcement-reads", row),
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
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
  return existing.length > 0;
}
