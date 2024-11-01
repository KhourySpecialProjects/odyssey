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
import type {
  BlockNode,
  TextNode,
  LinkNode,
  ListItemNode,
  ImageNode,
} from "@/types/strapi";

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
      ...(config.cache && { cache: config.cache }),
      ...(config.next && {
        next: { ...config.next, revalidate: config.revalidate ?? 60 },
      }),
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

export function strapiJSONToTiptapJSON(blockNodes: BlockNode[]): JSONContent[] {
  return blockNodes.map((node) => {
    switch (node.type) {
      case "text":
        return {
          type: "text",
          text: node.text,
          marks: [
            ...(node.bold ? [{ type: "bold" }] : []),
            ...(node.italic ? [{ type: "italic" }] : []),
            ...(node.underline ? [{ type: "underline" }] : []),
            ...(node.strikethrough ? [{ type: "strike" }] : []),
            ...(node.code ? [{ type: "code" }] : []),
          ],
        };

      case "link":
        return {
          type: "link",
          attrs: {
            href: node.url,
          },
          content: strapiJSONToTiptapJSON(node.children),
        };

      case "list-item":
        return {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: strapiJSONToTiptapJSON(node.children),
            },
          ],
        };

      case "image":
        return {
          type: "image",
          attrs: {
            src: node.image.url,
            alt: node.image.alternativeText,
            title: node.image.name,
          },
        };

      case "list":
        return {
          type: node.format === "ordered" ? "orderedList" : "bulletList",
          content: strapiJSONToTiptapJSON(node.children),
        };

      case "heading":
        return {
          type: "heading",
          attrs: {
            level: node.level,
          },
          content: strapiJSONToTiptapJSON(node.children),
        };

      case "paragraph":
        if (
          node.children.length === 1 &&
          node.children[0].type === "text" &&
          node.children[0].text === ""
        ) {
          return {
            type: "paragraph",
          };
        }
        return {
          type: "paragraph",
          content: strapiJSONToTiptapJSON(node.children),
        };

      case "quote":
        return {
          type: "blockquote",
          content: strapiJSONToTiptapJSON(node.children),
        };

      default:
        return {};
    }
  });
}

export function tiptapJSONToStrapiJSON(
  jsonContent: JSONContent[],
): BlockNode[] {
  return jsonContent.map((node) => {
    switch (node.type) {
      case "text":
        return {
          type: "text",
          text: node.text || "",
          bold: node.marks?.some((mark) => mark.type === "bold") || false,
          italic: node.marks?.some((mark) => mark.type === "italic") || false,
          underline:
            node.marks?.some((mark) => mark.type === "underline") || false,
          strikethrough:
            node.marks?.some((mark) => mark.type === "strike") || false,
          code: node.marks?.some((mark) => mark.type === "code") || false,
        };

      case "link":
        return {
          type: "link",
          url: node.attrs?.href || "",
          children: tiptapJSONToStrapiJSON(node.content || []),
        };

      case "listItem":
        return {
          type: "list-item",
          children:
            node.content?.flatMap((listItemNode) => {
              if (listItemNode.type === "paragraph") {
                return tiptapJSONToStrapiJSON(listItemNode.content || []);
              }
              return [];
            }) || [],
        };

      case "image":
        return {
          type: "image",
          image: {
            url: node.attrs?.src || "",
            alternativeText: node.attrs?.alt || "",
            name: node.attrs?.title || "",
            ext: "",
            hash: "",
            mime: "",
            size: 0,
            width: 0,
            height: 0,
            caption: "",
            formats: {},
            provider: "",
            createdAt: "",
            updatedAt: "",
            previewUrl: null,
            provider_metadata: null,
          },
          children: [],
        };

      case "bulletList":
        return {
          type: "list",
          format: "unordered",
          children: tiptapJSONToStrapiJSON(node.content || []),
        };

      case "orderedList":
        return {
          type: "list",
          format: "ordered",
          children: tiptapJSONToStrapiJSON(node.content || []),
        };

      case "heading":
        return {
          type: "heading",
          level: node.attrs?.level || 1,
          children: tiptapJSONToStrapiJSON(node.content || []),
        };

      case "paragraph":
        if (node.content && node.content.length > 0) {
          return {
            type: "paragraph",
            children: tiptapJSONToStrapiJSON(node.content || []),
          };
        } else {
          console.log("got here!!!");
          return {
            type: "paragraph",
            children: [{ type: "text", text: "" }],
          };
        }

      case "blockquote":
        return {
          type: "quote",
          children: tiptapJSONToStrapiJSON(node.content || []),
        };

      default:
        return { type: "text", text: "" }; // fallback for unknown types
    }
  });
}

export function youtubeUrlToEmbeddedUrl(url: string): string {
  const regExp =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\/)|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regExp);

  if (match && match[1]) {
    const videoId = match[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return "https://www.youtube.com/"; // Invalid URL format
}

export function embeddedUrlToYoutubeUrl(embedUrl: string): string {
  const regExp = /https?:\/\/(www\.)?youtube\.com\/embed\/([^&\n?#]+)/;
  const match = embedUrl.match(regExp);

  if (match && match[2]) {
    const videoId = match[2];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  return "https://www.youtube.com/";
}
