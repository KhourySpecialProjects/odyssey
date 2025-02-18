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
