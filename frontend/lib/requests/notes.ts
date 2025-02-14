"use server";

import { Enrollment, Note, Lesson, AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { revalidatePath, revalidateTag } from "next/cache";

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
    filters,
    pagination = { pageSize: 250, page: 1 },
    populate,
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
        fields: ["text", "color", "yLevel"],
      },
    },
    fields,
    pagination,
  };

  return await fetchAPI<Note[]>(path, {
    urlParams,
    next: { tags: ["notes"] },
  });
}

export async function updateNoteContent(noteId: number, newContent: string) {
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

    revalidatePath("/d/[slug]/[lessonSlug]", "page");
    revalidateTag("notes");

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
  highlight?: Highlight,
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
          lesson: lesson,
          enrollment: enrollment,
          positionY: position,
          highlight: highlight,
        },
      }),
    });

    if (!response.ok) {
      console.error("adding note failed:", await response.text());
      return { success: false, error: "Failed to add new tag" };
    }

    revalidatePath("/d/[slug]/[lessonSlug]", "page");
    revalidateTag("notes");
    console.log("created a note!!!!");
    return { success: true };
  } catch (error) {
    console.error("Error adding note:", error);
    return { success: false, error: "Failed to process request" };
  }
}
