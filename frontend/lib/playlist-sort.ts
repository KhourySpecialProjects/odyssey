/**
 * Sorts playlists by a sort key such as "name:asc" or "completion:desc".
 * Unsupported fields keep the original order. Returns a new array.
 */
export function sortPlaylists<
  T extends { name: string; completionPercentage?: number },
>(playlists: T[], sortKey?: string): T[] {
  if (!sortKey) return playlists;
  const [field, direction] = sortKey.split(":");
  const sign = direction === "asc" ? 1 : -1;

  if (field === "name") {
    return [...playlists].sort((a, b) => sign * a.name.localeCompare(b.name));
  }
  if (field === "completion") {
    return [...playlists].sort(
      (a, b) =>
        sign * ((a.completionPercentage ?? 0) - (b.completionPercentage ?? 0)),
    );
  }
  return playlists;
}
