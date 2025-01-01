import { Droplet } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

/**
 * Gets the first 25 Droplets matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getDroplets({
  sort,
  filters = { isHidden: false },
  pagination = { pageSize: 100, page: 1 },
  populate = {
    tags: true,
    lessons: {
      fields: ["id", "name", "slug"],
    },
  },
  fields = ["id", "name", "slug", "type", "focusArea", "status"],
}: StrapiRequestParams = {}): Promise<Droplet[]> {
  const path = `/droplets`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Droplet[]>(path, {
    urlParams,
  });
}

/**
 * Gets the desired Droplet by its unique slug.
 * @param slug The unique slug of the desired Droplet.
 * @param options Strapi query modifiers.
 * @returns The Droplet.
 */
export async function getDropletBySlug<T extends Partial<Droplet> = Droplet>(
  slug: string,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/droplets`;
  const urlParams = {
    sort,
    filters: { ...filters, slug },
    populate: {
      ...((typeof populate === 'object') ? populate : { populate: '*' }),
      droplet_lessons: {
        populate: ["lesson"],
        sort: ["orderIndex:asc"],
      },
    },
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T[]>(path, {
    urlParams,
  }).then((droplets) => droplets[0]);
}
// // export async function getDropletBySlug<T extends Partial<Droplet> = Droplet>(
// //   slug: string,
// //   { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
// // ): Promise<T> {
// //   const path = `/droplets`;
// //   const urlParams = {
// //     sort,
// //     filters: { ...filters, slug },
// //     populate: {
// //       populate,  //confirm this doesn't need a spread
// //       droplet_lessons: {
// //         populate: ["lesson"],
// //         sort: ["orderIndex:asc"], // Ensure lessons are returned in order
// //       },
// //     },
// //     fields,
// //     pagination: {
// //       pageSize: 1,
// //       page: 1,
// //     },
// //   };

//   return await fetchAPI<T[]>(path, {
//     urlParams,
//   }).then((droplets) => droplets[0]);
// }


// export async function getDropletBySlug<T extends Partial<Droplet> = Droplet>(
//   slug: string,
//   { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
// ): Promise<T> {
//   const path = `/droplets`;
//   const urlParams = {
//     sort,
//     filters: { ...filters, slug },
//     populate,
//     fields,
//     pagination: {
//       pageSize: 1,
//       page: 1,
//     },
//   };

//   return await fetchAPI<T[]>(path, {
//     urlParams,
//   }).then((droplets) => droplets[0]);
// }

export async function getDropletById<T extends Partial<Droplet> = Droplet>(
  id: number,
  { sort, filters, populate, fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/droplets/${id}`;
  const urlParams = {
    sort,
    filters: { ...filters },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T>(path, {
    urlParams,
  }).then((droplet) => droplet);
}

// get all droplets that are in draft status
export async function getDraftDroplets(): Promise<Droplet[]> {
  return await getDroplets({
    filters: { status: "draft" },
  });
}
