"use server";

import { Highlight } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { CACHE_TAGS } from "../cache-tags";
import { revalidateTag } from "next/cache";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function getHighlights(
  authorizedUserId: number,
  text: string,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    fields = ["id", "color", "text", "yLevel"],
  }: StrapiRequestParams = {},
): Promise<Highlight[]> {
  const path = `/highlights`;
  const urlParams = {
    sort,
    filters: {
      authorized_user: {
        id: { $eq: authorizedUserId },
      },
      text: { $eq: text },
    },
    populate: {
      lesson: {
        fields: ["id"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.highlights(authorizedUserId)], revalidate: 900 },
  });
}

export async function getHighlightsByDroplet(
  authUser: number,
  dropletId: number,
  {
    sort = ["yLevel:asc"],
    pagination = { pageSize: 250, page: 1 },
    fields = ["text", "color", "yLevel"],
  }: StrapiRequestParams = {},
): Promise<Highlight[]> {
  const path = `/highlights`;
  const urlParams = {
    sort,
    filters: {
      lesson: {
        droplets: {
          id: { $eq: dropletId },
        },
      },
      authorized_user: {
        id: { $eq: authUser },
      },
    },
    populate: {
      lesson: {
        fields: ["id", "name", "slug"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.highlights(authUser)], revalidate: 900 },
  });
}

export async function getAllHighlightsByUser(
  authorizedUserId: number,
): Promise<Highlight[]> {
  const path = `/highlights`;
  const pageSize = 250;
  let page = 1;
  let allHighlights: Highlight[] = [];

  while (true) {
    const urlParams = {
      sort: ["yLevel:asc"],
      filters: {
        authorized_user: { id: { $eq: authorizedUserId } },
      },
      populate: {
        lesson: { fields: ["id", "name", "slug"] },
      },
      fields: ["text", "color", "yLevel"],
      pagination: { page, pageSize },
    };

    const highlightsPage = await fetchAPI<Highlight[]>(path, {
      urlParams,
      next: {
        tags: [CACHE_TAGS.highlights(authorizedUserId)],
        revalidate: 900,
      },
    });

    if (!highlightsPage || highlightsPage.length === 0) break;
    allHighlights = allHighlights.concat(highlightsPage);
    if (highlightsPage.length < pageSize) break;
    page++;
  }

  return allHighlights;
}

export async function deleteHighlight(id: number, authorizedUserId: number) {
  const response = await fetch(`${STRAPI_API_URL}/api/highlights/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete highlight");
  }
  revalidateTag(CACHE_TAGS.highlights(authorizedUserId));
  return response.json();
}

/**
 * Gets one user's highlights on one lesson (the lesson viewer's initial
 * highlights). Keyed by lesson slug, like getNotesByAuthorizedUserAndLesson,
 * so the lesson page can fetch it in parallel with the lesson itself.
 */
export async function getHighlightsByAuthorizedUserAndLesson(
  authorizedUserId: number,
  lessonSlug: string,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    fields = ["text", "position", "color", "blockId", "yLevel"],
  }: StrapiRequestParams = {},
): Promise<Highlight[]> {
  const path = `/highlights`;
  const urlParams = {
    sort,
    filters: {
      authorized_user: {
        id: { $eq: authorizedUserId },
      },
      lesson: {
        slug: { $eq: lessonSlug },
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.highlights(authorizedUserId)], revalidate: 900 },
  });
}

export async function createHighlight(highlightData: any) {
  const response = await fetch(`${STRAPI_API_URL}/api/highlights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ data: highlightData.data }),
  });

  if (!response.ok) {
    throw new Error("Failed to create highlight");
  }
  revalidateTag(CACHE_TAGS.highlights(highlightData.data.authorized_user));
  return response.json();
}
