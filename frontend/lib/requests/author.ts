import { Author } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

/**
 * Gets the desired author by its unique authorized user email.
 * @param authorizedUserEmail The unique authorized user email of the desired author.
 * @param options Strapi query modifiers.
 * @returns The author.
 */
export async function getAuthorByAuthorizedUserEmail<
  T extends Partial<Author> = Author,
>(
  authorizedUserEmail: string,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/authors`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      authorizedUser: { email: { $eq: authorizedUserEmail } },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T[]>(path, {
    urlParams,
  }).then((authors) => authors[0]);
}
