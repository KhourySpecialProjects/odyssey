import { Tag } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, PopulateValue } from "../utils";

export async function getTags({
  sort,
  filters,
  fields = ["id", "name", "slug"],
  populate,
}: StrapiRequestParams = {}): Promise<Tag[]> {
  const path = `/tags`;
  const urlParams = {
    sort,
    filters,
    fields,
    populate,
    pagination: {
      pageSize: 25,
      page: 1,
    },
  };

  return await fetchAPI<Tag[]>(path, { urlParams });
}

export async function getTagBySlug(
  slug: string,
  populate?: PopulateValue
): Promise<Tag> {
  const path = `/tags`;
  const urlParams = {
    filters: { slug },
    populate,
  };

  return await fetchAPI<Tag[]>(path, { urlParams }).then((tags) => tags[0]);
}
