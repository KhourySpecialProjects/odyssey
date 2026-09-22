/**
 * Field gate for `authorized-user` writes (Settled Decision 1, ODY-474).
 *
 * Pure module with no imports and no `strapi` global, so it can be unit
 * tested without standing up a backend test harness.
 */

/**
 * The `authorized-user` side of every relation to `group`, verified against
 * `backend/src/api/authorized-user/content-types/authorized-user/schema.json`:
 *
 *   groupAdmin      manyToMany  inverse: group.admins
 *   groupManager    manyToMany  inverse: group.managers
 *   groupsCreated   oneToMany   inverse: group.creator
 *   groups          manyToMany  inverse: group.members
 *   archived_groups manyToMany  inverse: group.users_archived
 *
 * Note `users_archived` is the *group* side, not this side — the
 * authorized-user field is `archived_groups`. Easy to get backwards, and it
 * was wrong here once already.
 */
export const GROUP_RELEVANT_FIELDS = [
  'groupAdmin',
  'groupManager',
  'groupsCreated',
  'groups',
  'archived_groups',
];

type GateEvent = {
  params?: { data?: Record<string, unknown> | Record<string, unknown>[] };
};

/**
 * True when a write touches at least one group relation.
 *
 * `authorized-user` is written far more often than `group` — every friend
 * request, block, and sign-in PUTs to this model (see
 * `frontend/lib/requests/friends.ts`). Notifying on every one of those would
 * invalidate the global `groups`/`user-dashboard` tags constantly, which is
 * the thundering-herd problem this gate exists to prevent.
 *
 * `params.data` is an object for `create`/`update`/`updateMany`, but an
 * *array* of entries for `createMany` — normalize so both are checked.
 *
 * Deletes never reach here: `afterDelete`/`afterDeleteMany` carry no
 * `params.data` at all (Strapi v4 gives only `where`), and removing a user
 * unambiguously changes group membership, so callers treat them as
 * unconditionally group-relevant.
 */
export function touchesGroupRelations(event: GateEvent): boolean {
  const data = event?.params?.data;
  if (!data) return false;

  const entries = Array.isArray(data) ? data : [data];
  return entries.some(
    (entry) =>
      !!entry &&
      typeof entry === 'object' &&
      GROUP_RELEVANT_FIELDS.some((field) => field in entry),
  );
}

/** True if `model` requires the field gate before notifying. */
export function isGated(model: string): boolean {
  return model === 'api::authorized-user.authorized-user';
}
