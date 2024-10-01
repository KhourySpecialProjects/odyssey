import { clsx, type ClassValue } from "clsx";
import { parse } from "node-html-parser";
import qs from "qs";
import { twMerge } from "tailwind-merge";
import {
  AuthorizedUserRoleTitle,
  AuthorizedUserAdminRoles,
} from "@/lib/globals";
import { AuthorizedUserRole } from "@/types";
import { JSONContent } from "@tiptap/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStrapiURL(path = "") {
  return `${process.env.STRAPI_API_URL || "http://localhost:1337"}${path}`;
}

/**
 * Uppercase the first character in the given string.
 *
 * @param text target string to uppercase
 * @returns revised string
 */
export function uppercaseFirstChar(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Get initials for the given name.
 *
 * @param name name to get initials from
 * @returns extracted initials
 */
export function getInitials(name: string): string {
  const words = name.split(" ");
  const initials = words.map((word) => word.charAt(0).toUpperCase());
  return initials.join("");
}

export type PopulateValue =
  | string
  | {
      [key: string]: PopulateValue;
    };

export async function fetchAPI<T>(
  path: string,
  config: {
    urlParams?: Object;
    options?: Object;
    next?: Object;
    revalidate?: number;
    flattenResponse?: boolean;
    cache?: "no-store" | "force-cache";
  },
): Promise<T> {
  try {
    // Merge default and user options
    
    const mergedOptions = {
      
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.STRAPI_ACCESS_TOKEN, 
        
      },
      ...config.options, 
      ...config.cache && { cache: config.cache },
      ...config.next && {next: { ...config.next, revalidate: config.revalidate ?? 60 }},
      
    };
    console.log(mergedOptions);

    // Build request URL
    const queryString = qs.stringify(config.urlParams, {
      encodeValuesOnly: true,
    });
    const requestUrl = `${getStrapiURL(
      `/api${path}${queryString ? `?${queryString}` : ""}`,
    )}`;

    // Trigger API call
    return await fetch(requestUrl, mergedOptions).then(async (response) => {
      let data = await response.json();
      if (
        config.flattenResponse ||
        typeof config.flattenResponse === "undefined"
      ) {
        data = flattenAttributes(data.data);
      }
      return data;
    });
  } catch (error) {
    console.error(error);
    throw new Error(
      `Please check if your server is running and you set all the required tokens.`,
    );
  }
}

export function flattenAttributes(data: any): any {
  // Base case for recursion
  if (!data) return null;

  // Handling array data
  if (Array.isArray(data)) {
    return data.map(flattenAttributes);
  }

  let flattened: { [key: string]: any } = {};

  // Handling attributes
  if (data.attributes) {
    for (let key in data.attributes) {
      if (
        typeof data.attributes[key] === "object" &&
        data.attributes[key] !== null &&
        "data" in data.attributes[key]
      ) {
        flattened[key] = flattenAttributes(data.attributes[key].data);
      } else {
        flattened[key] = data.attributes[key];
      }
    }
  }

  // Copying non-attributes and non-data properties
  for (let key in data) {
    if (key !== "attributes" && key !== "data") {
      flattened[key] = data[key];
    }
  }

  // Handling nested data
  if (data.data) {
    flattened = { ...flattened, ...flattenAttributes(data.data) };
  }

  return flattened;
}

export function extractHeadings(html: string): any[] {
  if (!html || html.length === 0) return [];

  const root = parse(html);
  const headings = Array.from(
    root.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ).map((heading) => ({
    level: parseInt(heading.tagName[1]),
    text: heading.textContent?.trim(),
  }));

  return headings;
}

export function getPath(type: "droplet", slug: string): string {
  switch (type) {
    case "droplet":
      return `/d/${slug}`;
  }
}

export function isAuthorizedUserAdmin(
  roles: AuthorizedUserRoleTitle[],
): boolean {
  for (const role of roles) {
    if (AuthorizedUserAdminRoles.includes(role)) {
      return true;
    }
  }
  return false;
}

export function isContentCreator(roles: AuthorizedUserRoleTitle[]): boolean {
  for (const role of roles) {
    if (role === AuthorizedUserRoleTitle.ContentCreator) {
      return true;
    }
  }
  return false;
}

export function condenseRoleTitles(roles: AuthorizedUserRoleTitle[]): string {
  return roles.join(", ");
}

export function htmlToText(text: string): string {
  return text
    .replace(/<[^>]*>?/gm, "")
    .replace("&nbsp;", " ")
    .trim();
}

export function strapiJSONToTiptapJSON(level: any[]): JSONContent {
  level = level.map((node) => {
    // Base case: if there are no children, return the node as is
    if (!node.children) return node;

    // Recursively apply the transformation on the children
    const transformedNode: JSONContent = {
      ...node,
      content: strapiJSONToTiptapJSON(node.children), // Convert each child node recursively
    };

    delete transformedNode.children; // Remove the "children" key
    return transformedNode;
  });

  return level as JSONContent;
}

export function tiptapJSONToStrapiJSON(node: JSONContent[]): any {
  return node.map((node) => {
    // Base case: if there are no children, return the node as is
    if (!node.content) return node;

    // Recursively apply the transformation on the children
    const transformedNode = {
      ...node,
      children: tiptapJSONToStrapiJSON(node.content), // Convert each child node recursively
    };

    delete transformedNode.content; // Remove the "content" key
    return transformedNode;
  });
}
