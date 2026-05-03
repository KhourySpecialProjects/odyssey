import { Droplet, Playlist, Voyage } from "@/types";

type WithName = { name: string };
type WithDates = { createdAt?: string; updatedAt?: string };

/**
 * Generic sort over any array that has a `name` and optional date fields.
 * Handles: name:asc, name:desc, createdAt:asc, createdAt:desc,
 *          updatedAt:asc, updatedAt:desc.
 * Returns a new array — does not mutate the input.
 */
export function applySort<T extends WithName & WithDates>(
  items: T[],
  sortKey: string,
): T[] {
  const [field, direction] = sortKey.split(":");
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (field === "name") {
      const cmp = a.name.localeCompare(b.name);
      return direction === "asc" ? cmp : -cmp;
    }

    if (field === "createdAt" || field === "updatedAt") {
      const aVal = field === "createdAt" ? a.createdAt : a.updatedAt;
      const bVal = field === "createdAt" ? b.createdAt : b.updatedAt;
      const aTime = aVal ? new Date(aVal).getTime() : 0;
      const bTime = bVal ? new Date(bVal).getTime() : 0;
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    return 0;
  });

  return sorted;
}

/**
 * Case-insensitive substring search on item.name.
 * Returns true when query is empty.
 */
export function matchesSearch(item: WithName, query: string): boolean {
  if (!query) return true;
  return item.name.toLowerCase().includes(query.toLowerCase());
}

// Filter param shapes — values are multi-select arrays (OR within, AND across)
export type DropletFilterParams = {
  status?: string[];
  visibility?: string[];
  focusArea?: string[];
  type?: string[];
  difficulty?: string[];
};

export type PlaylistFilterParams = {
  visibility?: string[];
  public?: string[];
};

export type VoyageFilterParams = {
  visibility?: string[];
};

/**
 * Returns true when the droplet passes ALL active filters.
 * Within each filter the check is OR (any selected value matches).
 */
export function dropletMatchesFilters(
  droplet: Droplet,
  params: DropletFilterParams,
): boolean {
  const { status, visibility, focusArea, type, difficulty } = params;

  if (status && status.length > 0) {
    if (!status.includes(droplet.status)) return false;
  }

  if (visibility && visibility.length > 0) {
    const isArchived = droplet.isHidden ?? false;
    const matches =
      (visibility.includes("archived") && isArchived) ||
      (visibility.includes("active") && !isArchived);
    if (!matches) return false;
  }

  if (focusArea && focusArea.length > 0) {
    if (!focusArea.includes(droplet.focusArea)) return false;
  }

  if (type && type.length > 0) {
    if (!type.includes(droplet.type)) return false;
  }

  if (difficulty && difficulty.length > 0) {
    if (!difficulty.includes(droplet.difficulty)) return false;
  }

  return true;
}

/**
 * Returns true when the playlist passes ALL active filters.
 */
export function playlistMatchesFilters(
  playlist: Playlist,
  params: PlaylistFilterParams,
): boolean {
  const { visibility, public: publicFilter } = params;

  if (visibility && visibility.length > 0) {
    const isArchived = playlist.isArchived ?? false;
    const matches =
      (visibility.includes("archived") && isArchived) ||
      (visibility.includes("active") && !isArchived);
    if (!matches) return false;
  }

  if (publicFilter && publicFilter.length > 0) {
    const isPublic = playlist.isPublic;
    const matches =
      (publicFilter.includes("public") && isPublic) ||
      (publicFilter.includes("private") && !isPublic);
    if (!matches) return false;
  }

  return true;
}

/**
 * Returns true when the voyage passes ALL active filters.
 */
export function voyageMatchesFilters(
  voyage: Voyage,
  params: VoyageFilterParams,
): boolean {
  const { visibility } = params;

  if (visibility && visibility.length > 0) {
    const isArchived = voyage.isArchived ?? false;
    const matches =
      (visibility.includes("archived") && isArchived) ||
      (visibility.includes("active") && !isArchived);
    if (!matches) return false;
  }

  return true;
}
