"use server";

import { Gallery } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
/**
 * Returns the Gallery object with the given slug
 * @param slug the slug of the Gallery
 * @returns Gallery object
 */
export async function getGalleryBySlug(
  slug: string,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    populate = {
      items: {
        populate: {
          media: {
            fields: ["id", "url", "alternativeText", "width", "height"],
          },
        },
      },
    },
    fields = ["id", "slug", "title", "subtitle"],
  }: StrapiRequestParams = {},
): Promise<Gallery | undefined> {
  const path = `/galleries`;
  const urlParams = {
    sort,
    filters: {
      slug: { $eq: slug },
    },
    populate,
    fields,
    pagination,
  };

  // Galleries are edited in the Strapi admin, which has no revalidation hook,
  // so freshness is time-based only. The explicit revalidate keeps this in the
  // Next data cache even though /features is force-dynamic.
  const galleries = await fetchAPI<Gallery[]>(path, {
    urlParams,
    next: { revalidate: 3600 },
  });

  return galleries.length > 0 ? galleries[0] : undefined;
}
