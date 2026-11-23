import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI } from "@/lib/utils";

// Trusts the user id it's given: pass the session user. Never a "use server" file.

/** Numeric ids of the droplets this student dismissed. Throws if Strapi fails. */
export async function getDismissedDropletIds(
  userId: number,
): Promise<number[]> {
  const rows = await fetchAPI<{ droplet?: { id: number } | null }[] | null>(
    "/recommendation-dismissals",
    {
      urlParams: {
        filters: { user: { id: { $eq: userId } } },
        fields: ["id"],
        populate: { droplet: { fields: ["id"] } },
        sort: ["id:asc"],
        pagination: { page: 1, pageSize: 1000 },
      },
      next: { tags: [CACHE_TAGS.recommendations(userId)], revalidate: 900 },
    },
  );
  return (rows ?? []).flatMap((r) => (r.droplet ? [r.droplet.id] : []));
}
