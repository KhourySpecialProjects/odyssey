"use server";

import { Playlist } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "../auth/session";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { CACHE_TAGS } from "../cache-tags";

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the first 25 Playlists matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Playlists.
 */
export async function getPlaylists({
  sort = ["name:asc"],
  filters = { isPublic: true, isArchived: { $eq: false } },
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
  includeArchived = false,
}: StrapiRequestParams & { includeArchived?: boolean } = {}): Promise<
  Playlist[]
> {
  const path = `/playlists`;
  const urlParams = {
    sort,
    filters: includeArchived
      ? filters
      : { ...filters, isArchived: { $eq: false } },
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Playlist[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.playlists], revalidate: 900 },
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
    next: { tags: [CACHE_TAGS.playlists], revalidate: 900 },
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
  const path = `/playlists/${id}`;
  const urlParams = {
    sort,
    filters: { ...filters },
    populate,
    fields,
  };

  return await fetchAPI<T>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.playlists], revalidate: 900 },
  });
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
        set: data.droplets,
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

    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.allGroups);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);
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
        connect: [data.author.id],
      },
      slug: tempSlug, // this gets overwritten by Strapi
      isPublic: data.isPublic,
      droplets: {
        connect: data.droplets,
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

    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);
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

    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.allGroups);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Playlist." };
  }
}

export async function archivePlaylist(
  playlist: Playlist,
  archiveState: boolean,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");

    const [authorizedUser, fullPlaylist] = await Promise.all([
      getAuthorizedUserByEmail(user.email),
      getPlaylistById<Pick<Playlist, "id"> & { authors?: { id: number }[] }>(
        playlist.id,
        { populate: { authors: { fields: ["id"] } } },
      ),
    ]);

    if (!authorizedUser) {
      return { success: false, error: "Authorized user not found" };
    }
    if (!fullPlaylist) {
      return { success: false, error: "Playlist not found" };
    }

    const isAuthor = fullPlaylist.authors?.some(
      (a) => a.id === authorizedUser.id,
    );
    if (!isAuthor) {
      return {
        success: false,
        error: "Only authors can archive this playlist",
      };
    }

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/playlists/${playlist.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: { isArchived: archiveState } }),
      },
    );

    if (!response.ok) {
      console.error("Archive playlist error:", await response.text());
      throw new Error("Failed to archive playlist");
    }

    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);
    return { success: true };
  } catch (error) {
    console.error("Error archiving playlist:", error);
    return { success: false, error };
  }
}
