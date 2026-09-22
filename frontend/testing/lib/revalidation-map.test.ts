import { getTagsForModel, MODEL_TAG_MAP } from "@/lib/revalidation-map";
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

  describe("MODEL_TAG_MAP", () => {
    it("never contains literal tag strings that drift from CACHE_TAGS", () => {
      for (const tags of Object.values(MODEL_TAG_MAP)) {
        for (const tag of tags) {
          expect(Object.values(CACHE_TAGS)).toContain(tag);
        }
      }
    });
  });
});
