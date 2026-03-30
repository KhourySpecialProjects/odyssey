"use server";

import { Dataset } from "@/types";
import { fetchAPI, flattenAttributes } from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { datasetSchema, DatasetInput } from "../validations/dataset";
import { z } from "zod";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets all datasets for a given droplet.
 * @param dropletId The numeric ID of the droplet.
 * @returns Array of Dataset objects.
 */
export async function getDatasetsByDropletId(
  dropletId: number,
): Promise<Dataset[]> {
  return await fetchAPI<Dataset[]>("/datasets", {
    urlParams: {
      filters: {
        droplet: {
          id: { $eq: dropletId },
        },
      },
      populate: {},
      sort: ["createdAt:asc"],
    },
    next: { tags: [CACHE_TAGS.datasets], revalidate: 900 },
  });
}

/**
 * Creates a new dataset record in Strapi.
 * @param data Dataset metadata conforming to the datasetSchema.
 * @returns The created Dataset.
 */
export async function createDataset(
  data: DatasetInput,
): Promise<{ ok: boolean; error: string | null; data: Dataset | null }> {
  try {
    const validated = datasetSchema.parse(data);

    const response = await fetch(`${STRAPI_API_URL}/api/datasets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ data: validated }),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      const errorMessage =
        responseData.error?.message ?? "Failed to create dataset";
      return { ok: false, error: errorMessage, data: null };
    }

    revalidateTag(CACHE_TAGS.datasets);
    revalidateTag(CACHE_TAGS.droplets);

    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data) as Dataset,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.errors[0].message, data: null };
    }
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create dataset.",
      data: null,
    };
  }
}

/**
 * Deletes a dataset record from Strapi.
 * @param datasetId The numeric ID of the dataset to delete.
 */
export async function deleteDataset(
  datasetId: number,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/datasets/${datasetId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      return { ok: false, error: "Failed to delete dataset." };
    }

    revalidateTag(CACHE_TAGS.datasets);
    revalidateTag(CACHE_TAGS.droplets);

    return { ok: true, error: null };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to delete dataset.",
    };
  }
}
