import {
  getTagsForModel,
  isDeleteEvent,
  MODEL_TAG_MAP,
} from "@/lib/revalidation-map";
import { CACHE_TAGS } from "@/lib/cache-tags";

describe("revalidation-map", () => {
  describe("getTagsForModel", () => {
    it("returns the mapped tags for api::group.group", () => {
      expect(getTagsForModel("api::group.group")).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.allDueDates,
        CACHE_TAGS.userDashboard,
        CACHE_TAGS.authors,
      ]);
    });

    it("returns the mapped tags for api::authorized-user.authorized-user", () => {
      expect(getTagsForModel("api::authorized-user.authorized-user")).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
      ]);
    });

    it("returns an empty array for an unknown model", () => {
      expect(getTagsForModel("api::droplet.droplet")).toEqual([]);
    });

    it("returns an empty array for an empty string", () => {
      expect(getTagsForModel("")).toEqual([]);
    });
  });

  // Deletes bypass the backend's field gate, so they must clear everything a
  // user removal affects — not just the group tags a gated write can touch.
  describe("delete events widen the authorized-user tag set", () => {
    const userModel = "api::authorized-user.authorized-user";

    it.each(["afterDelete", "afterDeleteMany"])(
      "adds users + authors on %s",
      (event) => {
        expect(getTagsForModel(userModel, event)).toEqual([
          CACHE_TAGS.allGroups,
          CACHE_TAGS.userDashboard,
          CACHE_TAGS.users,
          CACHE_TAGS.authors,
        ]);
      },
    );

    it.each([
      "afterCreate",
      "afterUpdate",
      "afterCreateMany",
      "afterUpdateMany",
    ])("keeps the narrow set on %s", (event) => {
      expect(getTagsForModel(userModel, event)).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
      ]);
    });

    it("treats an absent event as a non-delete", () => {
      expect(getTagsForModel(userModel)).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
      ]);
    });

    it("treats a non-string event as a non-delete", () => {
      expect(getTagsForModel(userModel, 42)).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
      ]);
    });

    it("does not widen a model that has no onDelete set", () => {
      expect(getTagsForModel("api::group.group", "afterDelete")).toEqual(
        getTagsForModel("api::group.group"),
      );
    });

    it("never mutates the underlying map when widening", () => {
      getTagsForModel(userModel, "afterDelete");
      expect(MODEL_TAG_MAP[userModel].always).toEqual([
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
      ]);
    });
  });

  describe("isDeleteEvent", () => {
    it.each([
      ["afterDelete", true],
      ["afterDeleteMany", true],
      ["afterCreate", false],
      ["afterUpdateMany", false],
      ["", false],
    ])("%s -> %s", (event, expected) => {
      expect(isDeleteEvent(event)).toBe(expected);
    });

    it.each([undefined, null, 42, {}])("is false for %p", (event) => {
      expect(isDeleteEvent(event)).toBe(false);
    });
  });

  describe("MODEL_TAG_MAP", () => {
    it("never contains literal tag strings that drift from CACHE_TAGS", () => {
      for (const entry of Object.values(MODEL_TAG_MAP)) {
        for (const tag of [...entry.always, ...(entry.onDelete ?? [])]) {
          expect(Object.values(CACHE_TAGS)).toContain(tag);
        }
      }
    });
  });
});
