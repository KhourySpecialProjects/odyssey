"use server";

import { Highlight, HighlightColor } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "../utils";
import { CACHE_TAGS } from "../cache-tags";
import { revalidateTag } from "next/cache";
import { withAuth, assertOwner, type AuthUser } from "@/lib/auth/guards";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function getHighlightsByDroplet(
  authUser: number,
  dropletId: number,
  {
    sort = ["yLevel:asc"],
    pagination = { pageSize: 250, page: 1 },
    fields = ["text", "color", "yLevel"],
  }: StrapiRequestParams = {},
): Promise<Highlight[]> {
  const path = `/highlights`;
  const urlParams = {
    sort,
    filters: {
      lesson: {
        droplets: {
          id: { $eq: dropletId },
        },
      },
      authorized_user: {
        id: { $eq: authUser },
      },
    },
    populate: {
      lesson: {
        fields: ["id", "name", "slug"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.highlights(authUser)], revalidate: 900 },
  });
}

export async function getAllHighlightsByUser(
  authorizedUserId: number,
): Promise<Highlight[]> {
  const path = `/highlights`;
  const pageSize = 250;
  let page = 1;
  let allHighlights: Highlight[] = [];

  while (true) {
    const urlParams = {
      sort: ["yLevel:asc"],
      filters: {
        authorized_user: { id: { $eq: authorizedUserId } },
      },
      populate: {
        lesson: { fields: ["id", "name", "slug"] },
      },
      fields: ["text", "color", "yLevel"],
      pagination: { page, pageSize },
    };

    const highlightsPage = await fetchAPI<Highlight[]>(path, {
      urlParams,
      next: {
        tags: [CACHE_TAGS.highlights(authorizedUserId)],
        revalidate: 900,
      },
    });

    if (!highlightsPage || highlightsPage.length === 0) break;
    allHighlights = allHighlights.concat(highlightsPage);
    if (highlightsPage.length < pageSize) break;
    page++;
  }

  return allHighlights;
}

/**
 * Gets one user's highlights on one lesson (the lesson viewer's initial
 * highlights). Keyed by lesson slug, like getNotesByAuthorizedUserAndLesson,
 * so the lesson page can fetch it in parallel with the lesson itself.
 */
export async function getHighlightsByAuthorizedUserAndLesson(
  authorizedUserId: number,
  lessonSlug: string,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    fields = ["text", "position", "color", "blockId", "yLevel"],
  }: StrapiRequestParams = {},
): Promise<Highlight[]> {
  const path = `/highlights`;
  const urlParams = {
    sort,
    filters: {
      authorized_user: {
        id: { $eq: authorizedUserId },
      },
      lesson: {
        slug: { $eq: lessonSlug },
      },
    },
    // note.highlight is one-to-one, so the viewer must know which highlights
    // already have a note (a merge must never delete one; a second note would
    // take the link from the first).
    populate: { note: { fields: ["id"] } },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.highlights(authorizedUserId)], revalidate: 900 },
  });
}

type HighlightPosition = { start: number; end: number };

/** Every error code the highlight write actions can return. */
type HighlightWriteError =
  | "unauthenticated"
  | "forbidden"
  | "invalid"
  | "Highlight not found"
  | "Failed to save highlight"
  | "Failed to update highlight"
  | "Failed to delete highlight";

type HighlightWriteResult<T> = {
  ok: boolean;
  error: HighlightWriteError | null;
  data: T | null;
};

const HIGHLIGHT_COLORS: readonly string[] = [
  "#f9a8d4",
  "#fbd38d",
  "#fff300",
  "#86efac",
  "#93c5fd",
];

const isValidId = (id: unknown): id is number =>
  typeof id === "number" && Number.isSafeInteger(id) && id > 0;

const isValidColor = (color: unknown): boolean =>
  typeof color === "string" && HIGHLIGHT_COLORS.includes(color);

const isValidPosition = (position: unknown): boolean => {
  if (typeof position !== "object" || position === null) return false;
  const { start, end } = position as Record<string, unknown>;
  return (
    typeof start === "number" &&
    typeof end === "number" &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start < end
  );
};

const INVALID = { ok: false, error: "invalid", data: null } as const;

// A function declaration, so the Strapi-Response-Format guard test recognises it
function strapiWriteHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
    ...STRAPI_RESPONSE_FORMAT_HEADER,
  };
}

/**
 * Loads a highlight's owner and checks it is `user`. Admins get no bypass:
 * highlights are private study data (ODY-508).
 */
async function assertHighlightOwner(
  id: number,
  user: AuthUser,
): Promise<
  { ok: true } | { ok: false; error: "Highlight not found" | "forbidden" }
> {
  const found = await fetchAPI<
    { id: number; authorized_user?: { id: number } | null }[]
  >("/highlights", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["id"],
      populate: { authorized_user: { fields: ["id"] } },
      pagination: { pageSize: 1, page: 1 },
    },
    next: { tags: [CACHE_TAGS.highlights(user.id)], revalidate: 0 },
  });

  const highlight = found?.[0];
  if (!highlight) return { ok: false, error: "Highlight not found" };

  const owner = assertOwner(highlight.authorized_user?.id, user, {
    bypassRoles: [],
  });
  return owner.ok ? { ok: true } : { ok: false, error: owner.error };
}

/** Creates a highlight owned by the caller. Never throws. */
export async function createHighlight(input: {
  text: string;
  position: HighlightPosition;
  color: HighlightColor;
  blockId: number;
  lessonId: number;
}): Promise<HighlightWriteResult<Highlight>> {
  return withAuth([], async (user) => {
    if (!isValidColor(input.color) || !isValidPosition(input.position)) {
      return INVALID;
    }
    try {
      const response = await fetch(`${STRAPI_API_URL}/api/highlights`, {
        method: "POST",
        headers: strapiWriteHeaders(),
        body: JSON.stringify({
          data: {
            text: input.text,
            position: {
              start: input.position.start,
              end: input.position.end,
            },
            color: input.color,
            blockId: input.blockId,
            lesson: input.lessonId,
            authorized_user: user.id,
          },
        }),
      });

      if (!response.ok) {
        return { ok: false, error: "Failed to save highlight", data: null };
      }

      const json = await response.json();
      revalidateTag(CACHE_TAGS.highlights(user.id));
      return {
        ok: true,
        error: null,
        data: flattenAttributes(json.data) as Highlight,
      };
    } catch (error) {
      console.error("createHighlight failed:", error);
      return { ok: false, error: "Failed to save highlight", data: null };
    }
  });
}

/** Changes a highlight's colour, position or text. Owner only. Never throws. */
export async function updateHighlight(
  id: number,
  changes: {
    color?: HighlightColor;
    position?: HighlightPosition;
    text?: string;
  },
): Promise<HighlightWriteResult<Highlight>> {
  return withAuth([], async (user) => {
    if (
      !isValidId(id) ||
      (changes.color !== undefined && !isValidColor(changes.color)) ||
      (changes.position !== undefined && !isValidPosition(changes.position))
    ) {
      return INVALID;
    }
    try {
      const owner = await assertHighlightOwner(id, user);
      if (!owner.ok) return { ok: false, error: owner.error, data: null };

      // Only these fields can change; anything else a client sends is dropped.
      const data: Record<string, unknown> = {};
      if (changes.color !== undefined) data.color = changes.color;
      if (changes.position !== undefined) {
        // Rebuilt from the validated numbers, never the client's own object
        data.position = {
          start: changes.position.start,
          end: changes.position.end,
        };
      }
      if (changes.text !== undefined) data.text = changes.text;

      const response = await fetch(`${STRAPI_API_URL}/api/highlights/${id}`, {
        method: "PUT",
        headers: strapiWriteHeaders(),
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        return { ok: false, error: "Failed to update highlight", data: null };
      }

      const json = await response.json();
      revalidateTag(CACHE_TAGS.highlights(user.id));
      return {
        ok: true,
        error: null,
        data: flattenAttributes(json.data) as Highlight,
      };
    } catch (error) {
      console.error("updateHighlight failed:", error);
      return { ok: false, error: "Failed to update highlight", data: null };
    }
  });
}

/** Deletes a highlight. Owner only. Never throws. */
export async function deleteHighlight(
  id: number,
): Promise<HighlightWriteResult<{ id: number }>> {
  return withAuth([], async (user) => {
    if (!isValidId(id)) return INVALID;
    try {
      const owner = await assertHighlightOwner(id, user);
      if (!owner.ok) return { ok: false, error: owner.error, data: null };

      const response = await fetch(`${STRAPI_API_URL}/api/highlights/${id}`, {
        method: "DELETE",
        headers: strapiWriteHeaders(),
      });

      if (!response.ok) {
        return { ok: false, error: "Failed to delete highlight", data: null };
      }

      revalidateTag(CACHE_TAGS.highlights(user.id));
      return { ok: true, error: null, data: { id } };
    } catch (error) {
      console.error("deleteHighlight failed:", error);
      return { ok: false, error: "Failed to delete highlight", data: null };
    }
  });
}
