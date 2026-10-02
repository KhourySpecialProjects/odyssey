"use server";

import { Enrollment, Note, Lesson, Highlight } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import {
  resolveDocumentId,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "../strapi-document-id";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets all Notes matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getNotesByAuthorizedUserAndLesson(
  authorizedUserId: number,
  lessonSlug: string,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    fields = ["id", "content", "positionY"],
  }: StrapiRequestParams = {},
): Promise<Note[]> {
  const path = `/notes`;
  const urlParams = {
    sort,
    filters: {
      enrollment: {
        authorizedUser: {
          id: { $eq: authorizedUserId },
        },
      },
      lesson: {
        slug: { $eq: lessonSlug },
      },
    },
    populate: {
      highlight: {
        fields: ["*"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Note[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.notes(authorizedUserId)], revalidate: 900 },
  });
}

export async function getNotesByDroplet(
  authorizedUserId: number,
  dropletId: number,
  {
    sort,
    pagination = { pageSize: 250, page: 1 },
    fields = ["id", "content", "positionY"],
  }: StrapiRequestParams = {},
): Promise<Note[]> {
  const path = `/notes`;
  const urlParams = {
    sort,
    filters: {
      enrollment: {
        authorizedUser: {
          id: { $eq: authorizedUserId },
        },
      },
      lesson: {
        droplets: {
          id: { $eq: dropletId },
        },
      },
    },
    populate: {
      highlight: {
        fields: ["text", "color", "yLevel"],
      },
      lesson: {
        fields: ["*"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Note[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.notes(authorizedUserId)], revalidate: 900 },
  });
}

export async function updateNoteContent(
  noteId: number,
  newContent: string,
  authorizedUserId: number,
) {
  try {
    const response = await fetch(await strapiEntryUrl("notes", noteId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: {
          content: newContent,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update note content");
    }

    revalidateTag(CACHE_TAGS.notes(authorizedUserId));

    return { success: true };
  } catch (error) {
    console.error("Error updating note content:", error);
    return { success: false, error };
  }
}

export async function updateNotePosition(
  noteId: number,
  newPos: number,
  authorizedUserId: number,
) {
  try {
    const response = await fetch(await strapiEntryUrl("notes", noteId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: {
          positionY: newPos,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update note content");
    }

    revalidateTag(CACHE_TAGS.notes(authorizedUserId));

    return { success: true };
  } catch (error) {
    console.error("Error updating note content:", error);
    return { success: false, error };
  }
}

export async function createNote(
  lesson: Lesson,
  enrollment: Enrollment,
  position: number,
  authorizedUserId: number,
  highlight?: Highlight,
  content?: string,
) {
  try {
    // Strapi v5 relation writes take documentIds. The entities usually carry
    // one already, in which case no lookup happens.
    let relations: {
      lesson: string;
      enrollment: string;
      highlight: string | undefined;
    };
    try {
      relations = {
        lesson: await resolveDocumentId("lessons", lesson),
        enrollment: await resolveDocumentId("enrollments", enrollment),
        highlight: highlight
          ? await resolveDocumentId("highlights", highlight)
          : undefined,
      };
    } catch (err) {
      if (err instanceof StrapiEntryNotFoundError) {
        // Same as Strapi rejecting a relation that does not exist.
        console.error("adding note failed:", err.message);
        return { success: false, error: "Failed to add new note" };
      }
      throw err;
    }

    const response = await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: {
          content: "",
          lesson: relations.lesson,
          enrollment: relations.enrollment,
          positionY: Math.round(position),
          highlight: relations.highlight,
        },
      }),
    });

    if (!response.ok) {
      console.error("adding note failed:", await response.text());
      return { success: false, error: "Failed to add new note" };
    }

    revalidateTag(CACHE_TAGS.notes(authorizedUserId));
    return { success: true };
  } catch (error) {
    console.error("Error adding note:", error);
    return { success: false, error: "Failed to process request" };
  }
}

export async function getAllNotesByUser(
  authorizedUserId: number,
): Promise<Note[]> {
  const path = `/notes`;
  const pageSize = 250;
  let page = 1;
  let allNotes: Note[] = [];

  while (true) {
    const urlParams = {
      filters: {
        enrollment: { authorizedUser: { id: { $eq: authorizedUserId } } },
      },
      populate: {
        highlight: { fields: ["text", "color", "yLevel"] },
        lesson: { fields: ["id", "name", "slug"] },
      },
      fields: ["id", "content", "positionY"],
      pagination: { page, pageSize },
    };

    const notesPage = await fetchAPI<Note[]>(path, {
      urlParams,
      next: { tags: [CACHE_TAGS.notes(authorizedUserId)], revalidate: 900 },
    });

    if (!notesPage || notesPage.length === 0) break;
    allNotes = allNotes.concat(notesPage);
    if (notesPage.length < pageSize) break;
    page++;
  }

  return allNotes;
}

export async function deleteNote(id: number, authorizedUserId: number) {
  try {
    let url: string;
    try {
      url = await strapiEntryUrl("notes", id);
    } catch (err) {
      // Same result as the 404 Strapi used to return for a missing note.
      if (err instanceof StrapiEntryNotFoundError) {
        return { ok: false, error: "Not Found", data: null };
      }
      throw err;
    }
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
    });
    const data = await response.json();
    if (!response.ok || (response.ok && data.error))
      return { ok: false, error: data.error.message, data: null };

    revalidateTag(CACHE_TAGS.notes(authorizedUserId));

    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Note." };
  }
}
