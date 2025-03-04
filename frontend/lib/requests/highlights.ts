"use server";

import { Highlight } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

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
    next: { tags: ["highlights"] },
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
        populate: {
          droplet_lessons: {
            fields: ["id"],
          },
        },
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: ["highlights"] },
  });
}
