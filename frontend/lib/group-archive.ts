import { Group } from "@/types";

export type GroupArchiveState = {
  archivedForMe: boolean;
  archivedForEveryone: boolean;
  isEffectivelyArchived: boolean;
  canManage: boolean; // creator | admin | manager
};

export type GroupRole = "creator" | "admin" | "manager" | "member";

/**
 * Decides how a group is archived for a given viewer, combining the
 * per-user `users_archived` relation with the group-level `isArchived` flag.
 *
 * The group-level flag wins: a member can't override an admin's archive.
 * See docs/plans/ODY-494.md Resolved Decision R1.
 */
export function getGroupArchiveState(
  group: Group,
  viewerId: number,
): GroupArchiveState {
  const archivedForMe = (group.users_archived ?? []).some(
    (u) => u.id === viewerId,
  );
  const archivedForEveryone = group.isArchived === true;

  const canManage =
    group.creator?.id === viewerId ||
    (group.admins ?? []).some((a) => a.id === viewerId) ||
    (group.managers ?? []).some((m) => m.id === viewerId);

  return {
    archivedForMe,
    archivedForEveryone,
    isEffectivelyArchived: archivedForMe || archivedForEveryone,
    canManage,
  };
}

/**
 * Returns the viewer's highest role in the group, or null if they have no
 * role at all. Precedence: creator > admin > manager > member.
 */
export function getHighestGroupRole(
  group: Group,
  viewerId: number,
): GroupRole | null {
  if (group.creator?.id === viewerId) return "creator";
  if ((group.admins ?? []).some((a) => a.id === viewerId)) return "admin";
  if ((group.managers ?? []).some((m) => m.id === viewerId)) return "manager";
  if ((group.members ?? []).some((m) => m.id === viewerId)) return "member";
  return null;
}
