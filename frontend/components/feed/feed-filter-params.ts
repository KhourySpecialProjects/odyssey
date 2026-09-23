import { AnnouncementTypeTitle } from "@/lib/globals";
import { AnnouncementType } from "@/types";

// Not a client module: the activity page parses `?filters=` on the server to
// pre-render the same feed page the client would otherwise fetch on mount.

export const FILTER_VALUES = Object.values(AnnouncementTypeTitle);
const VALUE_BY_SLUG = new Map(
  FILTER_VALUES.map((v) => [v.toLowerCase(), v as AnnouncementTypeTitle]),
);

// Uses "." as the separator (not "," so URLSearchParams doesn't %2C-encode it).
// None of the filter values contain a dot, so this is safe.
export const FILTER_SEPARATOR = ".";

export function parseFilters(raw: string | null): AnnouncementTypeTitle[] {
  if (raw === null) return FILTER_VALUES;
  if (raw === "") return [];
  // Backward-compat: accept "," too for shared links created before the
  // separator change.
  const parts = raw
    .split(/[.,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const matched = parts
    .map((slug) => VALUE_BY_SLUG.get(slug))
    .filter((v): v is AnnouncementTypeTitle => Boolean(v));
  return Array.from(new Set(matched));
}

/** The announcement `type` values the feed query filters on. */
export function toFeedRoles(
  selected: AnnouncementTypeTitle[],
): AnnouncementType[] {
  return selected.map((role) => role.toLowerCase() as AnnouncementType);
}
