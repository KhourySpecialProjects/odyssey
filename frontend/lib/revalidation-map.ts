import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Maps a Strapi model UID to the Next.js cache tags that must be revalidated
 * when the backend notifies us of a write to that model.
 *
 * Pure module — no I/O, no `next/cache` import — so it stays trivially
 * unit-testable independent of the route handler that calls it.
 *
 * To extend: add one entry here, and add the matching model UID to
 * `WATCHED_MODELS` in the backend subscriber (`backend/src/index.ts`).
 */
export const MODEL_TAG_MAP: Record<string, string[]> = {
  // Mirrors what `deleteGroup` already revalidates so admin-side and
  // UI-side deletes converge on identical behavior.
  "api::group.group": [
    CACHE_TAGS.allGroups,
    CACHE_TAGS.allDueDates,
    CACHE_TAGS.userDashboard,
    CACHE_TAGS.authors,
  ],
  // Covers the ticket's literal repro (editing `groupAdmin` from the user
  // side). Deliberately excludes `users` / `authors` — the backend only
  // notifies for group-relevant writes to this model (see the field gate in
  // `backend/src/index.ts`), so a wider mapping here would be dead weight.
  "api::authorized-user.authorized-user": [
    CACHE_TAGS.allGroups,
    CACHE_TAGS.userDashboard,
  ],
};

/**
 * Returns the cache tags to revalidate for a given Strapi model UID, or an
 * empty array if the model is not registered.
 */
export function getTagsForModel(model: string): string[] {
  return MODEL_TAG_MAP[model] ?? [];
}
