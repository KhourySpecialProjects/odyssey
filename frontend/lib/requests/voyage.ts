"use server";

import { Voyage } from "@/types";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets all published voyages with their voyage_playlists populated.
 * @returns The list of published Voyages.
 */
export async function getVoyages(): Promise<Voyage[]> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      status: { $eq: "published" },
    },
    populate: {
      voyage_playlists: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug", "isPublic"],
            populate: {
              droplets: {
                fields: ["id"],
              },
            },
          },
        },
        sort: ["orderIndex:asc"],
      },
      authors: {
        fields: ["id", "name"],
      },
    },
    sort: ["name:asc"],
    pagination: {
      pageSize: 100,
      page: 1,
    },
  };

  return await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
  });
}

/**
 * Gets a single Voyage by its unique slug, deeply populated.
 * @param slug The unique slug of the desired Voyage.
 * @returns The Voyage, or null if not found.
 */
export async function getVoyageBySlug(slug: string): Promise<Voyage | null> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      slug: { $eq: slug },
    },
    populate: {
      voyage_playlists: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug"],
            populate: {
              droplets: {
                fields: ["id", "name", "slug"],
              },
            },
          },
        },
        sort: ["orderIndex:asc"],
      },
      authors: {
        fields: ["id", "name"],
      },
    },
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  const voyages = await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
  });

  return voyages[0] || null;
}

/**
 * Creates a new Voyage. Faculty/Admin only.
 * @param data The voyage data to create.
 * @returns The created Voyage, or an error.
 */
export async function createVoyage(data: {
  name: string;
  description?: string;
  playlists: { id: number; orderIndex?: number }[];
  status?: "draft" | "published";
  authorId?: number;
}) {
  try {
    const dataToSend: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "draft",
      voyage_playlists: data.playlists.map((p, i) => ({
        playlist: p.id,
        orderIndex: p.orderIndex ?? i,
      })),
    };

    if (data.authorId) {
      dataToSend.authors = { connect: [data.authorId] };
    }

    const response = await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ data: dataToSend }),
    });

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to create voyage",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data),
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create voyage.",
      data: null,
    };
  }
}

/**
 * Updates an existing Voyage.
 * @param id The ID of the Voyage to update.
 * @param data The updated voyage data.
 * @returns The updated Voyage, or an error.
 */
export async function updateVoyage(
  id: number,
  data: {
    name?: string;
    description?: string;
    playlists?: { id: number }[];
    status?: "draft" | "published";
  },
) {
  try {
    const dataToSend: Record<string, unknown> = {};

    if (data.name !== undefined) dataToSend.name = data.name;
    if (data.description !== undefined)
      dataToSend.description = data.description;
    if (data.status !== undefined) dataToSend.status = data.status;
    if (data.playlists !== undefined) {
      dataToSend.voyage_playlists = data.playlists.map((p, i) => ({
        playlist: p.id,
        orderIndex: i,
      }));
    }

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: dataToSend }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to update voyage",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data),
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update voyage.",
      data: null,
    };
  }
}

/**
 * Deletes a Voyage by ID.
 * @param id The ID of the Voyage to delete.
 * @returns Success/failure result.
 */
export async function deleteVoyage(id: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      return { ok: false, error: "Failed to delete voyage.", data: null };
    }

    const data = await response.json();

    revalidateTag(CACHE_TAGS.voyages);
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to delete voyage.",
      data: null,
    };
  }
}
