import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchFriends(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      populate: {
        friends: {
          fields: ["id", "email", "firstName", "lastName", "bio"]
        }
      },
      pagination: {
        pageSize: 25,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships?" + query,
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

export async function fetchFriendRequests(): Promise<AuthorizedUser[]> {
    try {
      const query = qs.stringify({
        populate: {
          friends: {
            fields: ["id", "email", "firstName", "lastName", "bio"]
          }
        },
        pagination: {
          pageSize: 25,
          page: 1,
        },
      });
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships?" + query,
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
