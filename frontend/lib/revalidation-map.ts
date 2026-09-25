import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Cache tags to revalidate for a watched Strapi model.
 *
 * The split exists because the backend's field gate is event-dependent. For
 * `authorized-user`, create/update writes only notify when they touch a group
 * relation (see `touchesGroupRelations` in `backend/src/index.ts`), so the
 * group tags are all that can be affected. Deletes deliberately bypass that
 * gate — a deleted user changes far more than group membership — so they need
 * a wider tag set.
 */
type ModelTags = {
  /** Invalidated by any watched write to this model. */
  always: string[];
  /** Additional tags invalidated only by delete events, which bypass the field gate. */
  onDelete?: string[];
};

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
export const MODEL_TAG_MAP: Record<string, ModelTags> = {
  // Mirrors what `deleteGroup` already revalidates so admin-side and
  // UI-side deletes converge on identical behavior.
  "api::group.group": {
    always: [
      CACHE_TAGS.allGroups,
      CACHE_TAGS.allDueDates,
      CACHE_TAGS.userDashboard,
      CACHE_TAGS.authors,
    ],
  },
  "api::authorized-user.authorized-user": {
    // Gated writes reach us only when a group relation changed, so group
    // tags are the whole story. Covers the ticket's literal repro (editing
    // `groupAdmin` from the user side).
    always: [CACHE_TAGS.allGroups, CACHE_TAGS.userDashboard],
    // Deletes are ungated, so they must also clear what Odyssey's own
    // `deleteAuthorizedUser` clears (`lib/requests/authorized-user.ts`).
    // Without these, a user deleted in the Strapi admin keeps appearing in
    // `fetchWebsiteCreators` / `fetchContentEditors` — and those are tagged
    // `revalidate: 3600`, so the stale window is an hour, not 900s.
    onDelete: [CACHE_TAGS.users, CACHE_TAGS.authors],
  },
};

/**
 * True for the two lifecycle events that bypass the backend's field gate.
 * Matches the event names the subscriber sends: `afterDelete`,
 * `afterDeleteMany`.
 */
export function isDeleteEvent(event: unknown): boolean {
  return typeof event === "string" && event.startsWith("afterDelete");
}

/**
 * Returns the cache tags to revalidate for a given Strapi model UID, or an
 * empty array if the model is not registered.
 *
 * `event` is optional: an absent or unrecognized event is treated as a
 * non-delete, which is the conservative choice — it never over-invalidates.
 */
export function getTagsForModel(model: string, event?: unknown): string[] {
  const entry = MODEL_TAG_MAP[model];
  if (!entry) return [];

  return isDeleteEvent(event) && entry.onDelete
    ? [...entry.always, ...entry.onDelete]
    : entry.always;
}
