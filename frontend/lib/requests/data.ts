import { flattenAttributes } from "@/lib/utils";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchDroplets() {
  try {
    const query = qs.stringify({
      sort: ["name"],
      fields: ["id", "name", "type", "slug", "isHidden"],
      pagination: {
        pageSize: 250,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/droplets?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: ["droplets"], revalidate: 0 },
      },
    );
    const data = await response.json();
    const droplets = flattenAttributes(data.data);
    return droplets;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

export async function fetchGroups() {
  try {
    const query = qs.stringify({
      sort: ["groupName:asc"],
      fields: ["id", "groupName", "slug", "isArchived"],
      populate: {
        members: {
          fields: ["id", "email"],
        },
        admins: {
          fields: ["id", "email"],
        },
        managers: {
          fields: ["id", "email"],
        },
        creator: {
          fields: ["id", "email"],
        },
      },
      pagination: {
        pageSize: 250,
        page: 1,
      },
    });

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/groups?${query}`,
      {
        headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch groups.");
    }

    const data = await response.json();
    const groups = flattenAttributes(data.data);
    return groups;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch groups.");
  }
}

export async function fetchAccessRequests() {
  try {
    const query = qs.stringify({
      sort: ["email"],
      fields: [
        "id",
        "givenName",
        "familyName",
        "email",
        "affiliation",
        "college",
      ],
      pagination: {
        pageSize: 250,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/access-requests?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const accessRequests = flattenAttributes(data.data);
    return accessRequests;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch access requests data.");
  }
}

export async function fetchReports() {
  try {
    const query = qs.stringify({
      sort: ["createdAt"],
      fields: "*",
      pagination: {
        pageSize: 250,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/reports?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const reports = flattenAttributes(data.data);
    return reports;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch access requests data.");
  }
}
