import { fetchAPI } from "@/lib/utils";
import { LISTED_DROPLET_FILTER } from "@/lib/droplet-visibility";

type DropletAccessRow = {
  id: number;
  isHidden: boolean;
  status: string;
  authorized_users?: { id: number }[];
};

// Fresh read (no-store) so enrollment writes never trust a stale visibility.
export async function getDropletAccessFresh(
  id: number,
): Promise<DropletAccessRow | null> {
  const rows = await fetchAPI<DropletAccessRow[]>("/droplets", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["id", "isHidden", "status"],
      populate: { authorized_users: { fields: ["id"] } },
      pagination: { page: 1, pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

// Returns the subset of `ids` that are currently listed.
export async function getListedDropletIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await fetchAPI<{ id: number }[]>("/droplets", {
    urlParams: {
      filters: { id: { $in: ids }, ...LISTED_DROPLET_FILTER },
      fields: ["id"],
      pagination: { page: 1, pageSize: Math.min(ids.length, 1000) },
    },
    cache: "no-store",
  });
  return (rows ?? []).map((r) => r.id);
}
