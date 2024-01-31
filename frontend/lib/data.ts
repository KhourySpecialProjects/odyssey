import axios from "axios";
import qs from "qs";
import { flattenAttributes } from "@/lib/utils";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchAuthorizedUsers() {
  try {
    const query = qs.stringify({
      sort: ["email"],
      fields: ["id", "email", "isAdmin", "isEnabled"],
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });
    const response = await axios.get(
      STRAPI_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
      }
    );
    const authorizedUsers = flattenAttributes(response.data.data);
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
      fields: ["id"],
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });
    const response = await fetch(
      STRAPI_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      }
    );
    const data = await response.json();
    const authorizedUsers = flattenAttributes(data.data);
    return authorizedUsers.length > 0;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

export async function fetchIsAdmin(email: string) {
  try {
    const query = qs.stringify({
      filters: {
        email: {
          $eq: email,
        },
      },
      fields: ["isAdmin"],
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });
    const response = await fetch(
      STRAPI_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      }
    );
    const data = await response.json();
    const authorizedUsers = flattenAttributes(data.data);
    if (authorizedUsers.length === 0) return false;
    return authorizedUsers[0].isAdmin;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}
