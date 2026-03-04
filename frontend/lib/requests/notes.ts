"use server";

import { Enrollment, Note, Lesson, Highlight } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";

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
    next: { tags: [CACHE_TAGS.notes(authorizedUserId)] },
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
    next: { tags: [CACHE_TAGS.notes(authorizedUserId)] },
  });
}

export async function updateNoteContent(
  noteId: number,
  newContent: string,
  authorizedUserId: number,
) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/notes/${noteId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            content: newContent,
          },
        }),
      },
    );

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
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/notes/${noteId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            positionY: newPos,
          },
        }),
      },
    );

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
    const response = await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          content: "",
          lesson: lesson.id,
          enrollment: enrollment.id,
          positionY: Math.round(position),
          highlight: highlight?.id,
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

export async function deleteNote(id: number, authorizedUserId: number) {
  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/notes/" + id,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
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
