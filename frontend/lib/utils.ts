import { clsx, type ClassValue } from "clsx";
import { parse } from "node-html-parser";
import qs from "qs";
import { twMerge } from "tailwind-merge";
import {
  AuthorizedUserRoleTitle,
  AuthorizedUserAdminRoles,
} from "@/lib/globals";
import { JSONContent } from "@tiptap/react";
import type { BlockNode, TextNode } from "@/types/strapi";
import type { DropletDifficulty } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStrapiURL(path = "") {
  return `${process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337"}${path}`;
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
 * Returns Tailwind color classes for a difficulty badge.
 *
 * @param difficulty The droplet difficulty value
 * @returns Tailwind class string for the badge color
 */
export function getDifficultyBadgeColor(
  difficulty: DropletDifficulty | string,
): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
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
    options?: RequestInit;
    next?: { revalidate?: number; tags?: string[] };
    flattenResponse?: boolean;
    cache?: "no-store" | "force-cache";
  },
): Promise<T> {
  try {
    // Dev-only guard: cache and next are mutually exclusive in Next.js 15.
    // Passing both causes Next.js to silently ignore both options.
    if (process.env.NODE_ENV === "development" && config.cache && config.next) {
      throw new Error(
        `fetchAPI("${path}"): "cache" and "next" options are mutually exclusive. ` +
          `Use cache: "no-store" for uncached fetches, or next: { revalidate, tags } for cached fetches.`,
      );
    }

    const mergedOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.STRAPI_ACCESS_TOKEN,
      },
      ...config.options,
      ...(config.cache && { cache: config.cache }),
      ...(config.next && { next: config.next }),
    };

    const queryString = qs.stringify(config.urlParams, {
      encodeValuesOnly: true,
    });

    // Use different base URLs for client and server
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    const requestUrl = `${baseUrl}/api${path}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(requestUrl, mergedOptions);

    if (!response.ok) {
      console.error("Response status:", response.status);
      console.error("Response status text:", response.statusText);
      const errorText = await response.text();
      console.error("Response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (
      config.flattenResponse ||
      typeof config.flattenResponse === "undefined"
    ) {
      const temp = flattenAttributes(data.data);
      return temp;
    }

    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw new Error(
      `Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function flattenAttributes(data: any): any {
  if (!data) return null;

  if (Array.isArray(data)) {
    return data.map(flattenAttributes);
  }

  let flattened: { [key: string]: any } = {};

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
  roles?: AuthorizedUserRoleTitle[] | null,
): boolean {
  if (!roles) return false;

  for (const role of roles) {
    if (AuthorizedUserAdminRoles.includes(role)) {
      return true;
    }
  }
  return false;
}

export function isContentCreator(
  roles?: AuthorizedUserRoleTitle[] | null,
): boolean {
  if (!roles) return false;

  for (const role of roles) {
    if (role === AuthorizedUserRoleTitle.ContentCreator) {
      return true;
    }
  }
  return false;
}

export function isContentEditor(
  roles?: AuthorizedUserRoleTitle[] | null,
): boolean {
  if (!roles) return false;

  for (const role of roles) {
    if (role === AuthorizedUserRoleTitle.ContentEditor) {
      return true;
    }
  }
  return false;
}

export function condenseRoleTitles(
  roles?: AuthorizedUserRoleTitle[] | null,
): string {
  if (!roles) return "";
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
          type: "text",
          text: (node.children[0] as TextNode).text,
          marks: [
            {
              type: "link",
              attrs: {
                href: node.url,
                target: "_blank",
              },
            },
          ],
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

      case "code":
        return {
          type: "codeBlock",
          attrs: {
            language: node.language,
          },
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
        if (node.marks?.some((mark) => mark.type === "link")) {
          return {
            type: "link",
            url:
              node.marks.find((mark) => mark.type === "link")?.attrs?.href ||
              "",
            children: [
              {
                type: "text",
                text: node.text || "",
                bold: node.marks?.some((mark) => mark.type === "bold") || false,
                italic:
                  node.marks?.some((mark) => mark.type === "italic") || false,
                underline:
                  node.marks?.some((mark) => mark.type === "underline") ||
                  false,
                strikethrough:
                  node.marks?.some((mark) => mark.type === "strike") || false,
                code: node.marks?.some((mark) => mark.type === "code") || false,
              },
            ],
          };
        }
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
            ext: ".jpg",
            url: node.attrs?.src || "",
            hash: "",
            mime: "image/jpeg",
            name: node.attrs?.title || "",
            size: 0,
            width: 0,
            height: 0,
            caption: node.attrs?.alt || "",
            formats: {
              thumbnail: {
                ext: ".jpg",
                url: node.attrs?.src || "",
                hash: "",
                mime: "image/jpeg",
                name: node.attrs?.title || "",
                path: null,
                size: 0,
                width: 0,
                height: 0,
              },
            },
            alternativeText: node.attrs?.alt || "",
            provider: "local",
            provider_metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            previewUrl: null,
          },
          children: [],
        } as BlockNode;

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

      case "codeBlock":
        return {
          type: "code",
          language: node.attrs?.language || "plaintext",
          children: node.content
            ? tiptapJSONToStrapiJSON(node.content)
            : [{ type: "text", text: "" }],
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

export function isAuthorizedUserFaculty(
  roles?: AuthorizedUserRoleTitle[] | null,
): boolean {
  if (!roles) return false;

  for (const role of roles) {
    if (role === AuthorizedUserRoleTitle.Faculty) {
      return true;
    }
  }
  return false;
}

//used in group-droplet-tile.tsx, droplet-tile.tsx, due-date-announcement.tsx
export const getDueDateBadgeColor = (
  daysUntil: number,
  includeLate: boolean,
) => {
  if (daysUntil > 14) {
    return "bg-emerald-400 text-emerald-800 border border-emerald-400";
  } else if (daysUntil > 3) {
    return "bg-amber-300 text-amber-800 border border-amber-400";
  } else if (daysUntil >= 0) {
    return "bg-red-300 text-red-800 border border-red-400";
  } else if (daysUntil < 0 && includeLate) {
    return "bg-red-400 text-red-900 border border-red-700";
  }
};

export const stripHtmlTags = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

export function parseSandpackFiles(
  json: string | null | undefined,
): Record<string, string> {
  try {
    const parsed = JSON.parse(json || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Helper function to convert BlockNote JSON to markdown
export function convertBlockNoteToMarkdown(blocks: any[]): string {
  return blocks
    .map((block) => {
      const text =
        block.content
          ?.map((content: any) => {
            let formatted = content.text || "";

            // Apply text styles
            if (content.styles?.bold) formatted = `**${formatted}**`;
            if (content.styles?.italic) formatted = `*${formatted}*`;
            if (content.styles?.underline) formatted = `<u>${formatted}</u>`;
            if (content.styles?.strike) formatted = `~~${formatted}~~`;
            if (content.styles?.code) formatted = `\`${formatted}\``;

            return formatted;
          })
          .join("") || "";

      switch (block.type) {
        case "heading":
          const level = "#".repeat(block.props.level);
          return `${level} ${text}`;

        case "paragraph":
          return text || "";

        case "bulletListItem":
          return `- ${text}`;

        case "numberedListItem":
          return `1. ${text}`;

        case "image":
          const imgCaption = block.props.caption || "";
          return block.props.url ? `![${imgCaption}](${block.props.url})` : "";

        case "video":
          return block.props.url
            ? `#### Video\n\nVideo Link: ${block.props.url}${block.props.caption ? `\n\n*${block.props.caption}*` : ""}`
            : "";

        case "callout":
          const calloutType = block.props.calloutType || "default";
          return `> **${calloutType.charAt(0).toUpperCase() + calloutType.slice(1)}**\n> \n> ${text}`;

        case "quiz-true-false":
          return `#### True/False Question\n\n**Q:** ${block.props.question}\n\n**Correct Answer:** ${block.props.correctAnswer ? "True" : "False"}`;

        case "quiz-open-ended":
          return `#### Open-Ended Question\n\n**Q:** ${block.props.question}\n\n**Answer:** ${block.props.correctAnswer}`;

        case "quiz-multiple-choice":
          const options = block.props.options
            ?.map(
              (opt: any, idx: number) =>
                `   ${idx + 1}. ${opt.text} ${opt.isCorrect ? "✓ (Correct)" : ""}`,
            )
            .join("\n");
          return `#### Multiple Choice Question\n\n**Q:** ${block.props.question}\n\n${options}`;

        default:
          return "";
      }
    })
    .filter((line) => line !== "")
    .join("\n\n");
}
