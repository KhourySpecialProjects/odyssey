import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/** Flushes every cache a publish can change. */
export function revalidatePublishedEdit() {
  revalidateTag(CACHE_TAGS.authors);
  revalidateTag(CACHE_TAGS.droplets);
  revalidateTag(CACHE_TAGS.lesson);
  revalidateTag(CACHE_TAGS.playlists);
  revalidateTag(CACHE_TAGS.voyages);
  revalidateTag(CACHE_TAGS.allEnrollments);
  revalidateTag(CACHE_TAGS.allGroups);
  revalidateTag(CACHE_TAGS.allUserContent);
  revalidateTag(CACHE_TAGS.allUserDashboards);
}
