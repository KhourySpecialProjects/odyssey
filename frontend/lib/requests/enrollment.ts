import { Enrollment } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, flattenAttributes } from "../utils";
import qs from "qs";

/**
 * Gets the first 25 enrollments matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getEnrollmentsByAuthorizedUser(
  authorizedUserId: number,
  {
    sort,
    filters,
    pagination = { pageSize: 25, page: 1 },
    populate = {
      droplet: {
        populate: {
          lessons: {
            fields: ["id", "name", "slug"],
          },
        },
      },
      viewedLessons: {
        fields: ["id", "name", "slug"],
      },
    },
    fields = ["id"],
  }: StrapiRequestParams = {},
): Promise<Enrollment[]> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      $and: [filters, { authorizedUser: { id: { $eq: authorizedUserId } } }],
    },
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Enrollment[]>(path, {
    urlParams,
    next: { tags: ["enrollments"] },
  });
}

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
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<boolean> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      $and: {
        ...filters,
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
    (enrollments) => enrollments.length > 0,
  );
}


/**
 * Determines if the given authorized user is enrolled in the given Droplet.
 * @param authorizedUserId The unique ID of the authorized user.
 * @param dropletId The unique ID of the Droplet.
 * @param options Strapi query modifiers.
 * @returns `true` if the authorized user is already enrolled in the Droplet, else `false`.
 */

export async function getIsEnrollComplete(
  authorizedUserId: number,
  dropletId: number,
  { sort, filters = {}, populate = "*", fields = ["isComplete"] }: StrapiRequestParams = {},
): Promise<Enrollment[]> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      $and: [
        {authorizedUser: { id: { $eq: authorizedUserId } }},
        {droplet: { id: { $eq: dropletId } }},
      ],
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  const fetchapi = await fetchAPI<Enrollment[]>(path, { urlParams })
  console.log("api call", fetchapi);
  return fetchapi;
}

