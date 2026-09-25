/**
 * Unit tests for the backend's `authorized-user` field gate.
 *
 * The gate is the subtlest logic in the ODY-474 revalidation mechanism and
 * has already regressed once (a `createMany` array-shape bug found in code
 * review). The backend has no Jest harness of its own, so the predicate was
 * extracted into `backend/src/lib/group-relations.ts` — a pure module with
 * no imports and no `strapi` global — and is exercised from here.
 *
 * If a backend test harness is ever added, move this file there unchanged.
 */
import {
  GROUP_RELEVANT_FIELDS,
  isGated,
  touchesGroupRelations,
} from "../../../backend/src/lib/group-relations";

describe("touchesGroupRelations", () => {
  describe("single-object params.data (create / update / updateMany)", () => {
    it.each(GROUP_RELEVANT_FIELDS)("returns true when %s is present", (f) => {
      expect(touchesGroupRelations({ params: { data: { [f]: [1, 2] } } })).toBe(
        true,
      );
    });

    it("returns false for a write touching only non-group fields", () => {
      expect(
        touchesGroupRelations({
          params: { data: { bio: "hello", firstName: "Sam" } },
        }),
      ).toBe(false);
    });

    it("returns true when a group field is mixed in with non-group fields", () => {
      expect(
        touchesGroupRelations({
          params: { data: { bio: "hello", groupAdmin: [] } },
        }),
      ).toBe(true);
    });

    it("returns true for a present-but-empty group relation (membership cleared)", () => {
      expect(touchesGroupRelations({ params: { data: { groups: [] } } })).toBe(
        true,
      );
    });

    it("returns true when the value is null (relation being unset)", () => {
      expect(
        touchesGroupRelations({ params: { data: { groupsCreated: null } } }),
      ).toBe(true);
    });

    it("returns false for an empty data object", () => {
      expect(touchesGroupRelations({ params: { data: {} } })).toBe(false);
    });
  });

  // Regression guard: `createMany` passes an ARRAY of entries, not an object.
  // `field in data` against an array is silently false for every field, which
  // made the gate unreachable on that path.
  describe("array params.data (createMany)", () => {
    it("returns true when any entry touches a group relation", () => {
      expect(
        touchesGroupRelations({
          params: { data: [{ bio: "a" }, { groupManager: [3] }] },
        }),
      ).toBe(true);
    });

    it("returns false when no entry touches a group relation", () => {
      expect(
        touchesGroupRelations({
          params: { data: [{ bio: "a" }, { firstName: "b" }] },
        }),
      ).toBe(false);
    });

    it("returns false for an empty array", () => {
      expect(touchesGroupRelations({ params: { data: [] } })).toBe(false);
    });

    it("does not throw on non-object entries", () => {
      expect(() =>
        touchesGroupRelations({
          params: { data: [null, 42, "x"] as never },
        }),
      ).not.toThrow();
    });
  });

  // Deletes carry only `where`. Callers must treat them as unconditionally
  // group-relevant rather than consulting this predicate — these cases assert
  // the predicate's own behaviour, not the caller's.
  describe("absent params.data (delete / deleteMany)", () => {
    it.each([
      ["no params at all", {}],
      ["params without data", { params: {} }],
      ["explicitly undefined data", { params: { data: undefined } }],
      ["where-only params (delete)", { params: { where: { id: 1 } } as never }],
    ])("returns false for %s", (_label, event) => {
      expect(touchesGroupRelations(event)).toBe(false);
    });
  });

  describe("GROUP_RELEVANT_FIELDS", () => {
    // `users_archived` is the GROUP side of that relation; the
    // authorized-user side is `archived_groups`. Getting this backwards was a
    // real bug caught in review.
    it("uses the authorized-user side of every group relation", () => {
      expect(GROUP_RELEVANT_FIELDS).toEqual([
        "groupAdmin",
        "groupManager",
        "groupsCreated",
        "groups",
        "archived_groups",
      ]);
    });

    it("does not contain the group-side field name", () => {
      expect(GROUP_RELEVANT_FIELDS).not.toContain("users_archived");
    });
  });
});

describe("isGated", () => {
  it("gates authorized-user", () => {
    expect(isGated("api::authorized-user.authorized-user")).toBe(true);
  });

  it("does not gate group — every group write is group-relevant", () => {
    expect(isGated("api::group.group")).toBe(false);
  });

  it("does not gate an unwatched model", () => {
    expect(isGated("api::droplet.droplet")).toBe(false);
  });
});
