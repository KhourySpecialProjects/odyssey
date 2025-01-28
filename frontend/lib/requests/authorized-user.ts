import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the desired authorized user by its unique email.
 * @param email The unique email of the desired authorized user.
 * @param options Strapi query modifiers.
 * @returns The authorized user.
 */
export async function getAuthorizedUserByEmail<
  T extends Partial<AuthorizedUser> = AuthorizedUser,
>(
  email: string,
  {
    sort,
    filters,
    populate = {
      received_requests: {
        fields: ["id", "email", "firstName", "lastName", "bio"],
        populate: {
          profilePhoto: "*",
        },
      },
      sent_requests: {
        fields: ["id", "email", "firstName", "lastName", "bio"],
        populate: {
          profilePhoto: "*",
        },
      },
    },
    fields = ["*", "firstName", "lastName", "bio", "id"],
  }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/authorized-users`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      email: { $eq: email },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T[]>(path, { urlParams }).then(
    (authorizedUsers) => authorizedUsers[0],
  );
}

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      sort: ["email"],
      fields: ["id", "email", "isEnabled", "firstName", "lastName", "bio"],
      populate: {
        roles: { fields: ["title"] },
        profilePhoto: "*",
      },
      pagination: {
        pageSize: 25,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const authorizedUsers = flattenAttributes(data.data);
    return authorizedUsers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

export async function fetchIsAuthorizedUser(email: string) {
  try {
    const query = qs.stringify({
      filters: {
        email: {
          $eq: email,
        },
      },
      fields: ["id", "isEnabled"],
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const authorizedUsers = flattenAttributes(data.data);
    return authorizedUsers.length > 0 && authorizedUsers[0]["isEnabled"];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}
