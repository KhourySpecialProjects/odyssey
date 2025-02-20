"use server";

import { Playlist } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const NEXT_PUBLIC_STRAPI_API_TOKEN =
  process.env.NEXT_PUBLIC_STRAPI_API_TOKEN || "";

/**
 * Gets the first 25 Playlists matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Playlists.
 */
export async function getPlaylists({
  sort,
  filters = { isPublic: true },
  pagination = { pageSize: 250, page: 1 },
  populate = {
    droplets: {
      populate: {
        lessons: {
          fields: ["id", "name", "slug"],
        },
      },
    },
    authorized_users: {
      fields: ["id"],
    },
  },
  fields = ["id", "name", "slug", "isPublic"],
}: StrapiRequestParams = {}): Promise<Playlist[]> {
  const path = `/playlists`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Playlist[]>(path, {
    urlParams,
    cache: "no-store",
  });
}

/**
 * Gets the desired Playlist by its unique slug.
 * @param slug The unique slug of the desired Playlist.
 * @param options Strapi query modifiers.
 * @returns The Playlist.
 */
export async function getPlaylistBySlug(
  slug: string,
  {
    populate = {
      droplets: {
        populate: {
          tags: true,
          lessons: {
            fields: ["id", "name", "slug"],
          },
        },
      },
      authors: {
        fields: ["id", "name"],
        populate: "*"
      },
    },
  }: StrapiRequestParams = {},
): Promise<Playlist | null> {
  const path = `/playlists`;
  const urlParams = {
    filters: {
      slug: {
        $eq: slug,
      },
    },
    populate,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  const playlists = await fetchAPI<Playlist[]>(path, {
    urlParams,
    cache: "no-store",
  });

  return playlists[0] || null;
}

/**
 * Gets the desired Playlist by its ID.
 * @param id The ID of the desired Playlist.
 * @param options Strapi query modifiers.
 * @returns The Playlist.
 */
export async function getPlaylistById<T extends Partial<Playlist> = Playlist>(
  id: number,
  { sort, filters, populate, fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  try {
    const query = qs.stringify({
      sort,
      filters: { ...filters },
      populate,
      fields,
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/playlists/" + id + "?" + query,
      {
        headers: { Authorization: "Bearer " + NEXT_PUBLIC_STRAPI_API_TOKEN },
        cache: "no-store",
      },
    );

    const data = await response.json();
    return flattenAttributes(data.data) as T;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch playlist by id.");
  }
}

// export async function getPlaylistsByAuthor(
//   authorId: number,
//   { filters = {}, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
// ): Promise<Playlist[]> {
//   const path = `/playlists`;
//   const urlParams = {
//     filters: {
//       ...filters,
//       author: { id: { $eq: authorId } },
//     },
//     populate,
//     fields,
//   };

//   return await fetchAPI<Playlist[]>(path, { urlParams });
// }
