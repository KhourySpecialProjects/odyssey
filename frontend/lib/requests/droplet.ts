import { Droplet } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, PopulateValue } from "../utils";

export async function getDroplets({
  sort,
  filters,
  populate,
  fields = ["id", "name", "type", "slug"],
}: StrapiRequestParams = {}): Promise<Droplet[]> {
  const path = `/droplets`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination: {
      pageSize: 25,
      page: 1,
    },
  };

  return await fetchAPI<Droplet[]>(path, { urlParams });
}

export async function getDropletBySlug(
  slug: string,
  populate?: PopulateValue
): Promise<Droplet> {
  const path = `/droplets`;
  const urlParams = {
    filters: { slug },
    populate,
  };

  return await fetchAPI<Droplet[]>(path, { urlParams }).then(
    (droplets) => droplets[0]
  );
}
