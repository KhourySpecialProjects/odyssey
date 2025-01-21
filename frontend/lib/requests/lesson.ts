import { Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

/**
 * Gets the desired lesson by its unique slug.
 * @param slug The unique slug of the desired lesson.
 * @param options Strapi query modifiers.
 * @returns The lesson.
 */
export async function getLessonBySlug<T extends Partial<Lesson> = Lesson>(
  slug: string,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/lessons`;
  const urlParams = {
    sort,
    filters: { ...filters, slug },
    populate: {
      blocks: {
        populate: {
          questions: {
            populate: ["answerOptions"],
          },
        },
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
    cache: "no-store",
  }).then((lessons) => lessons[0]);
}
