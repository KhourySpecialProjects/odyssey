import { fetchAPI } from "../utils";
import { CACHE_TAGS } from "../cache-tags";

/**
 * Display names for a droplet's authors, for the read-only draft Overview.
 * Reads only those users' names (no roles, no other fields), and returns an
 * empty list when the lookup fails so the page never breaks over it. Not a
 * `"use server"` file: it is called from Server Components only.
 */
export async function getAuthorNames(
  ids: number[],
): Promise<{ id: number; name: string }[]> {
  const authorIds = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (authorIds.length === 0) return [];

  try {
    const users = await fetchAPI<
      { id: number; firstName?: string | null; lastName?: string | null }[]
    >("/authorized-users", {
      urlParams: {
        filters: { id: { $in: authorIds } },
        fields: ["id", "firstName", "lastName"],
        pagination: { pageSize: 100, page: 1 },
      },
      next: { tags: [CACHE_TAGS.users], revalidate: 900 },
    });
    return (users ?? []).map((user) => ({
      id: user.id,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    }));
  } catch (error) {
    console.error("Error fetching author names:", error);
    return [];
  }
}
