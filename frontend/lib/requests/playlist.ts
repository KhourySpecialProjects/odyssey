"use server";

import { Playlist } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import qs from "qs";
import { revalidatePath, revalidateTag } from "next/cache";

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const NEXT_PUBLIC_STRAPI_API_TOKEN =
  process.env.NEXT_PUBLIC_STRAPI_API_TOKEN || "";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the first 25 Playlists matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Playlists.
 */
export async function getPlaylists({
  sort = ["name:asc"],
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
        populate: "*",
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

export async function updatePlaylist(
  id: number,
  data: {
    name: string;
    description: string;
    isPublic: boolean;
    droplets?: { id: number }[];
    authors?: { id: number };
    userId?: number;
    slug?: string;
  },
) {
  try {
    const dataToSend = {
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
      droplets: {
        set: data.droplets, // 'set' replaces all existing relationships
      },
      authorized_users: {
        set: [data.userId], // ensure author remains connected
      },
      slug: data.slug,
      regenerateSlug: false,
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/playlists/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: dataToSend }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to update playlist",
        data: null,
      };
    }

    revalidateTag("playlists");
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update playlist.",
      data: null,
    };
  }
}

export async function createPlaylist(data: {
  name: string;
  isPublic: boolean;
  description: string;
  droplets: { id: number }[];
  author: { id: number };
  userId: number;
}) {
  const tempSlug = "random";
  try {
    const dataToSend = {
      name: data.name,
      description: data.description,
      authors: {
        set: [data.author.id],
      },
      slug: tempSlug, // this gets overwritten by Strapi
      isPublic: data.isPublic,
      droplets: {
        connect: data.droplets,
      },
      authorized_users: {
        connect: [data.userId],
      },
    };

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/playlists`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: dataToSend }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to create playlist",
        data: null,
      };
    }

    revalidateTag("playlists");
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create playlist.",
      data: null,
    };
  }
}

export async function deletePlaylist(id: number) {
  try {
    const group = await getPlaylistById(id);

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/playlists/" + id,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: "Failed to delete playlist.", data: null };
    }

    revalidateTag("authors");
    revalidateTag("groups");
    revalidatePath("(general)/my-content", "page");
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Playlist." };
  }
}
