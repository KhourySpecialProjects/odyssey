import { Enrollment } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

/**
 * Determines if the given authorized user is enrolled in the given Droplet.
 * @param authorizedUserId The unique ID of the authorized user.
 * @param dropletId The unique ID of the Droplet.
 * @param options Strapi query modifiers.
 * @returns `true` if the authorized user is already enrolled in the Droplet, else `false`.
 */
export async function getIsEnrolled(
  authorizedUserId: number,
  dropletId: number,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {}
): Promise<boolean> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      $and: {
        authorizedUser: { id: { $eq: authorizedUserId } },
        droplet: { id: { $eq: dropletId } },
      },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<Enrollment[]>(path, { urlParams }).then(
    (enrollments) => enrollments.length > 0
  );
}
