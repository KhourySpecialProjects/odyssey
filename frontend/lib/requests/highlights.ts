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
import { resolveDocumentId, strapiEntryUrl } from "../strapi-document-id";
import { assertOwner, withAuth, type AuthUser } from "../auth/guards";
import { isHighlightColor } from "../highlight-colors";

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
    // A highlight holds at most one note, so the viewer needs to know which
    // already have one before merging highlights or adding a note
    populate: { note: { fields: ["id"] } },
    fields,
    pagination,
  };

  return await fetchAPI<Highlight[]>(path, {
    urlParams,
    // note is populated, so creating or deleting a note refreshes this too
    next: {
      tags: [
        CACHE_TAGS.highlights(authorizedUserId),
        CACHE_TAGS.notes(authorizedUserId),
      ],
      revalidate: 900,
    },
  });
}

type HighlightPosition = Highlight["position"];

type HighlightResult<T> =
  | { ok: true; error: null; data: T }
  | { ok: false; error: string; data: null };

const INVALID = { ok: false, error: "invalid", data: null } as const;

const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isPosition = (value: unknown): value is HighlightPosition => {
  if (typeof value !== "object" || value === null) return false;
  const { start, end } = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    (start as number) >= 0 &&
    (start as number) < (end as number)
  );
};

/**
 * Loads a highlight for a write and checks the caller owns it. No role
 * bypasses this: highlights are private study data (ODY-508).
 */
async function findOwnHighlight(
  id: number,
  user: AuthUser,
): Promise<
  | { ok: true; highlight: { id: number; documentId: string } }
  | { ok: false; error: string }
> {
  const [highlight] =
    (await fetchAPI<
      {
        id: number;
        documentId: string;
        authorized_user?: { id: number } | null;
      }[]
    >("/highlights", {
      urlParams: {
        filters: { id: { $eq: id } },
        fields: ["id", "documentId"],
        populate: { authorized_user: { fields: ["id"] } },
        pagination: { page: 1, pageSize: 1 },
      },
      cache: "no-store",
    })) ?? [];
  if (!highlight) return { ok: false, error: "not found" };

  const owner = assertOwner(highlight.authorized_user?.id, user, {
    bypassRoles: [],
  });
  return owner.ok ? { ok: true, highlight } : owner;
}

/**
 * Saves a highlight for the signed-in user. Never throws: a failed save
 * returns `{ ok: false }` so the lesson can take the highlight back off.
 */
export async function createHighlight(highlight: {
  text: string;
  position: HighlightPosition;
  color: HighlightColor;
  blockId: number;
  lessonId: number;
}): Promise<HighlightResult<Highlight>> {
  return withAuth([], async (user) => {
    if (typeof highlight !== "object" || highlight === null) return INVALID;
    const { text, position, color, blockId, lessonId } = highlight;
    if (
      !isText(text) ||
      !isPosition(position) ||
      !isHighlightColor(color) ||
      !Number.isSafeInteger(blockId) ||
      !isId(lessonId)
    ) {
      return INVALID;
    }

    try {
      const response = await fetch(`${STRAPI_API_URL}/api/highlights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        body: JSON.stringify({
          data: {
            text,
            // Rebuilt from the checked numbers, never the client's object
            position: { start: position.start, end: position.end },
            color,
            blockId,
            lesson: await resolveDocumentId("lessons", lessonId),
            authorized_user: await resolveDocumentId("authorized-users", {
              id: user.id,
              documentId: user.documentId,
            }),
          },
        }),
      });

      if (!response.ok) {
        console.error("createHighlight failed:", response.status);
        return { ok: false, error: "Failed to save highlight", data: null };
      }

      revalidateTag(CACHE_TAGS.highlights(user.id));
      const json = await response.json();
      return { ok: true, error: null, data: flattenAttributes(json.data) };
    } catch (error) {
      console.error("createHighlight failed:", error);
      return { ok: false, error: "Failed to save highlight", data: null };
    }
  });
}

/**
 * Changes a highlight's colour, or its range and text when another highlight
 * is merged into it. Only its owner can. Never throws.
 */
export async function updateHighlight(
  id: number,
  changes: {
    color?: HighlightColor;
    position?: HighlightPosition;
    text?: string;
  },
): Promise<HighlightResult<Highlight>> {
  return withAuth([], async (user) => {
    if (typeof changes !== "object" || changes === null) return INVALID;
    const { color, position, text } = changes;
    if (
      !isId(id) ||
      (color === undefined && position === undefined && text === undefined) ||
      (color !== undefined && !isHighlightColor(color)) ||
      (position !== undefined && !isPosition(position)) ||
      (text !== undefined && !isText(text))
    ) {
      return INVALID;
    }

    try {
      const found = await findOwnHighlight(id, user);
      if (!found.ok) return { ok: false, error: found.error, data: null };

      // Only these fields can change; anything else the client sent is dropped
      const data: Partial<Pick<Highlight, "color" | "position" | "text">> = {};
      if (color !== undefined) data.color = color;
      if (position !== undefined) {
        data.position = { start: position.start, end: position.end };
      }
      if (text !== undefined) data.text = text;

      const response = await fetch(
        await strapiEntryUrl("highlights", found.highlight),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
          body: JSON.stringify({ data }),
        },
      );

      if (!response.ok) {
        console.error("updateHighlight failed:", response.status);
        return { ok: false, error: "Failed to update highlight", data: null };
      }

      revalidateTag(CACHE_TAGS.highlights(user.id));
      // Notes show their highlight's colour and text
      revalidateTag(CACHE_TAGS.notes(user.id));
      const json = await response.json();
      return { ok: true, error: null, data: flattenAttributes(json.data) };
    } catch (error) {
      console.error("updateHighlight failed:", error);
      return { ok: false, error: "Failed to update highlight", data: null };
    }
  });
}

/** Deletes a highlight. Only its owner can. Never throws. */
export async function deleteHighlight(
  id: number,
): Promise<HighlightResult<{ id: number }>> {
  return withAuth([], async (user) => {
    if (!isId(id)) return INVALID;

    try {
      const found = await findOwnHighlight(id, user);
      if (!found.ok) return { ok: false, error: found.error, data: null };

      // Strapi v5 answers a delete with an empty 204, so the body isn't read
      const response = await fetch(
        await strapiEntryUrl("highlights", found.highlight),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
        },
      );

      if (!response.ok) {
        console.error("deleteHighlight failed:", response.status);
        return { ok: false, error: "Failed to delete highlight", data: null };
      }

      revalidateTag(CACHE_TAGS.highlights(user.id));
      // A deleted highlight drops off its note
      revalidateTag(CACHE_TAGS.notes(user.id));
      return { ok: true, error: null, data: { id } };
    } catch (error) {
      console.error("deleteHighlight failed:", error);
      return { ok: false, error: "Failed to delete highlight", data: null };
    }
  });
}
