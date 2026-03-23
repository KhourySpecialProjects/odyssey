import { AccessRequest } from "@/components/shared/access-manager/access-requests/access-requests";
import { flattenAttributes } from "@/lib/utils";
import { CACHE_TAGS } from "../cache-tags";
import { Droplet, Group } from "@/types";
import qs from "qs";
import { Report } from "@/components/admin/reports/reports";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchDroplets() {
  try {
    let page = 1;
    const pageSize = 250;
    let allDroplets: Droplet[] = [];
    while (true) {
      const query = qs.stringify({
        sort: ["id"],
        fields: ["id", "name", "type", "slug", "isHidden"],
        populate: { tags: { fields: ["id", "name", "slug"] } },
        pagination: {
          pageSize,
          page,
        },
      });
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/droplets?" + query,
        {
          headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
          next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
        },
      );
      const data = await response.json();
      const droplets = flattenAttributes(data.data);
      allDroplets = allDroplets.concat(droplets);

      // If we got fewer than pageSize, we reached the end
      if (droplets.length < pageSize) break;

      page++; // fetch next page
    }
    return allDroplets;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch droplet data.");
  }
}

export async function fetchGroups() {
  try {
    let page = 1;
    const pageSize = 250;
    let allGroups: Group[] = [];
    while (true) {
      const query = qs.stringify({
        sort: ["id"],
        fields: ["id", "groupName", "slug", "isArchived", "semester"],
        populate: {
          members: {
            fields: ["id"],
          },
        },
        pagination: {
          pageSize,
          page,
        },
      });

      const response = await fetch(
        `${NEXT_PUBLIC_STRAPI_API_URL}/api/groups?${query}`,
        {
          headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
          next: { tags: [CACHE_TAGS.allGroups], revalidate: 900 },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch groups.");
      }

      const data = await response.json();
      const groups = flattenAttributes(data.data);
      allGroups = allGroups.concat(groups);

      // If we got fewer than pageSize, we reached the end
      if (groups.length < pageSize) break;

      page++; // fetch next page
    }
    return allGroups;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch groups.");
  }
}

export async function fetchAccessRequests() {
  try {
    let page = 1;
    const pageSize = 250;
    let allAccessRequests: AccessRequest[] = [];

    while (true) {
      const query = qs.stringify({
        sort: ["id"],
        fields: [
          "id",
          "givenName",
          "familyName",
          "email",
          "affiliation",
          "college",
        ],
        pagination: {
          pageSize,
          page,
        },
      });
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/access-requests?" + query,
        {
          headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
          next: { tags: [CACHE_TAGS.accessRequests], revalidate: 900 },
        },
      );
      const data = await response.json();
      const accessRequests = flattenAttributes(data.data);
      allAccessRequests = allAccessRequests.concat(accessRequests);

      // If we got fewer than pageSize, we reached the end
      if (accessRequests.length < pageSize) break;

      page++; // fetch next page
    }
    return allAccessRequests;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch access requests data.");
  }
}

export async function fetchReports() {
  try {
    let page = 1;
    const pageSize = 250;
    let allReports: Report[] = [];

    while (true) {
      const query = qs.stringify({
        sort: ["id:desc"],
        fields: "*",
        pagination: {
          pageSize,
          page,
        },
      });
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/reports?" + query,
        {
          headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
          next: { tags: [CACHE_TAGS.reports], revalidate: 900 },
        },
      );
      const data = await response.json();
      const reports = flattenAttributes(data.data);
      allReports = allReports.concat(reports);

      // If we got fewer than pageSize, we reached the end
      if (reports.length < pageSize) break;

      page++; // fetch next page
    }
    return allReports;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch reports data.");
  }
}
