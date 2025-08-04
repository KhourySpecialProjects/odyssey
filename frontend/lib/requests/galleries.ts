"use server";

import { Enrollment, Gallery } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidatePath } from "next/cache";
import { Droplet } from "@/types";

/**
 * Gets the first 25 enrollments matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getGalleryBySlug(
    slug: string,
    {
        sort,
        filters,
        pagination = { pageSize: 250, page: 1 },
        populate = {
            items: { populate: "*" }
        },
        fields = ["id", "slug", "title"],
    }: StrapiRequestParams = {},
): Promise<Gallery> {
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

    return (await fetchAPI<Gallery[]>(path, {
        urlParams,
        next: { tags: ["galleries"] },
        cache: "no-store",
    }))[0];
}
