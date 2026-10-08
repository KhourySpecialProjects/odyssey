import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { Group } from "@/types";

type Roles = AuthorizedUserRoleTitle[] | null | undefined;
type Viewer = { id?: number; roles?: Roles };
type Visibility = { isHidden?: boolean | null; status?: string | null };

export const DROPLET_STAFF_ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];

// Strapi filter for listings: not hidden and published.
export const LISTED_DROPLET_FILTER = {
  isHidden: { $eq: false },
  status: { $eq: "published" },
} as const;

export function isDropletListed(d: Visibility): boolean {
  return d.isHidden === false && d.status === "published";
}

export function isDropletStaff(roles?: Roles): boolean {
  return !!roles?.some((r) => DROPLET_STAFF_ROLES.includes(r));
}

// Access rule: listed, author, staff, or enrolled in a published-but-hidden droplet.
export function canViewDroplet(
  droplet: Visibility & { authorized_users?: { id: number }[] | null },
  viewer: Viewer,
  isEnrolled: boolean,
): boolean {
  if (isDropletListed(droplet)) return true;
  if (isDropletStaff(viewer.roles)) return true;
  if (
    viewer.id !== undefined &&
    droplet.authorized_users?.some((u) => u.id === viewer.id)
  ) {
    return true;
  }
  return droplet.status === "published" && isEnrolled;
}

// Returns a copy of the group keeping only droplets the viewer may open.
export function withViewableGroupDroplets<G extends Group>(
  group: G,
  viewer: Viewer,
  enrolledDropletIds: ReadonlySet<number>,
): G {
  const keep = <D extends Visibility & { id: number }>(list: D[]): D[] =>
    list.filter((d) => canViewDroplet(d, viewer, enrolledDropletIds.has(d.id)));

  return {
    ...group,
    droplets: group.droplets && keep(group.droplets),
    playlists: group.playlists?.map((p) => ({
      ...p,
      droplets: p.droplets && keep(p.droplets),
    })),
    voyages: group.voyages?.map((v) => ({
      ...v,
      voyage_nodes: v.voyage_nodes?.map((n) => ({
        ...n,
        playlist: n.playlist && {
          ...n.playlist,
          droplets: n.playlist.droplets && keep(n.playlist.droplets),
        },
      })),
    })),
  };
}
