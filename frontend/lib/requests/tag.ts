import { Tag } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, PopulateValue } from "../utils";
import { CACHE_TAGS } from "../cache-tags";

// sort server side by name ascending
export async function getTags({
  sort = ["name:asc"],
  filters,
  fields = ["id", "name", "slug"],
  populate,
}: StrapiRequestParams = {}): Promise<Tag[]> {
  const path = `/tags`;
  const urlParams = {
    sort,
    filters,
    fields,
    populate: {
      droplets: {
        fields: ["isHidden", "status"],
      },
    },
    pagination: {
      pageSize: 50,
      page: 1,
    },
  };

  return await fetchAPI<Tag[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.tags], revalidate: 3600 },
  });
}

export async function getTagBySlug(
  slug: string,
  populate?: PopulateValue,
): Promise<Tag> {
  const path = `/tags`;
  const urlParams = {
    filters: { slug },
    populate,
  };

  return await fetchAPI<Tag[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.tags], revalidate: 3600 },
  }).then((tags) => tags[0]);
}
