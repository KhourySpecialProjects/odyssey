import {
  LISTED_DROPLET_FILTER,
  canViewDroplet,
  isDropletListed,
  isDropletStaff,
  withViewableGroupDroplets,
} from "@/lib/droplet-visibility";
import { AuthorizedUserRoleTitle as R } from "@/lib/globals";
import type { Group } from "@/types";

const listed = { isHidden: false, status: "published" };
const hidden = { isHidden: true, status: "published" };
const draft = { isHidden: false, status: "draft" };

describe("isDropletListed", () => {
  it("is true only for visible + published", () => {
    expect(isDropletListed(listed)).toBe(true);
    expect(isDropletListed(hidden)).toBe(false);
    expect(isDropletListed(draft)).toBe(false);
    expect(isDropletListed({ isHidden: false, status: "edit" })).toBe(false);
    expect(isDropletListed({ isHidden: false, status: null })).toBe(false);
    expect(isDropletListed({ isHidden: null, status: "published" })).toBe(
      false,
    );
  });

  it("exposes the matching Strapi filter", () => {
    expect(LISTED_DROPLET_FILTER).toEqual({
      isHidden: { $eq: false },
      status: { $eq: "published" },
    });
  });
});

describe("isDropletStaff", () => {
  it("accepts SysAdmin and ContentEditor only", () => {
    expect(isDropletStaff([R.SysAdmin])).toBe(true);
    expect(isDropletStaff([R.User, R.ContentEditor])).toBe(true);
    expect(isDropletStaff([R.Faculty, R.ContentCreator])).toBe(false);
    expect(isDropletStaff(null)).toBe(false);
    expect(isDropletStaff(undefined)).toBe(false);
  });
});

describe("canViewDroplet", () => {
  it("allows listed droplets for anyone", () => {
    expect(canViewDroplet(listed, {}, false)).toBe(true);
  });

  it("allows a hidden droplet for its author", () => {
    const d = { ...hidden, authorized_users: [{ id: 7 }] };
    expect(canViewDroplet(d, { id: 7 }, false)).toBe(true);
    expect(canViewDroplet(d, { id: 8 }, false)).toBe(false);
  });

  it("allows hidden droplets for SysAdmin and ContentEditor, not Faculty", () => {
    expect(canViewDroplet(hidden, { roles: [R.SysAdmin] }, false)).toBe(true);
    expect(canViewDroplet(hidden, { roles: [R.ContentEditor] }, false)).toBe(
      true,
    );
    expect(canViewDroplet(hidden, { roles: [R.Faculty] }, false)).toBe(false);
  });

  it("allows an enrolled viewer on a published-but-hidden droplet", () => {
    expect(canViewDroplet(hidden, { id: 1 }, true)).toBe(true);
    expect(canViewDroplet(hidden, { id: 1 }, false)).toBe(false);
  });

  it("denies enrolled viewers on unpublished droplets", () => {
    expect(canViewDroplet(draft, { id: 1 }, true)).toBe(false);
    expect(canViewDroplet({ isHidden: true, status: "draft" }, {}, true)).toBe(
      false,
    );
    expect(canViewDroplet({ isHidden: false, status: "edit" }, {}, true)).toBe(
      false,
    );
    expect(canViewDroplet({ isHidden: false, status: null }, {}, true)).toBe(
      false,
    );
  });

  it("lets staff and authors open unpublished droplets", () => {
    expect(canViewDroplet(draft, { roles: [R.ContentEditor] }, false)).toBe(
      true,
    );
    expect(
      canViewDroplet(
        { ...draft, authorized_users: [{ id: 3 }] },
        { id: 3 },
        false,
      ),
    ).toBe(true);
  });
});

describe("withViewableGroupDroplets", () => {
  const d = (id: number, v: { isHidden: boolean; status: string }) => ({
    id,
    ...v,
  });
  const group = {
    id: 1,
    groupName: "G",
    droplets: [d(1, listed), d(2, hidden), d(3, draft)],
    playlists: [{ id: 10, droplets: [d(4, listed), d(5, hidden)] }],
    voyages: [
      {
        id: 20,
        voyage_nodes: [
          {
            id: 30,
            playlist: { id: 11, droplets: [d(6, hidden), d(7, listed)] },
          },
          { id: 31 },
        ],
      },
    ],
  } as unknown as Group;
  const ids = (list?: { id: number }[]) => list?.map((x) => x.id);

  it("filters loose, playlist and voyage-node droplets", () => {
    const out = withViewableGroupDroplets(group, {}, new Set());
    expect(ids(out.droplets)).toEqual([1]);
    expect(ids(out.playlists?.[0].droplets)).toEqual([4]);
    expect(ids(out.voyages?.[0].voyage_nodes?.[0].playlist?.droplets)).toEqual([
      7,
    ]);
    expect(out.voyages?.[0].voyage_nodes?.[1].playlist).toBeUndefined();
  });

  it("keeps a published-hidden droplet for an enrolled viewer", () => {
    const out = withViewableGroupDroplets(group, { id: 1 }, new Set([2, 5, 6]));
    expect(ids(out.droplets)).toEqual([1, 2]);
    expect(ids(out.playlists?.[0].droplets)).toEqual([4, 5]);
    expect(ids(out.voyages?.[0].voyage_nodes?.[0].playlist?.droplets)).toEqual([
      6, 7,
    ]);
  });

  it("keeps a draft for a staff viewer and does not mutate the input", () => {
    const out = withViewableGroupDroplets(
      group,
      { roles: [R.ContentEditor] },
      new Set(),
    );
    expect(ids(out.droplets)).toEqual([1, 2, 3]);
    expect(ids(group.droplets)).toEqual([1, 2, 3]);
  });
});
