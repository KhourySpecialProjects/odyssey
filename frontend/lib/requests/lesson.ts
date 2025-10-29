"use server";
import { Droplet, Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDropletById } from "./droplet";
import { z } from "zod";
import { LessonSchema } from "../validations/lesson";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the desired lesson by its unique slug.
 * @param slug The unique slug of the desired lesson.
 * @param options Strapi query modifiers.
 * @returns The lesson.
 */
export async function getLessonBySlug<T extends Partial<Lesson> = Lesson>(
  slug: string,
  { sort, filters, fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/lessons`;
  const urlParams = {
    sort,
    filters: { ...filters, slug },
    populate: {
      blocks: {
        populate: {
          questions: {
            populate: ["answerOptions"],
          },
        },
      },
    },
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T[]>(path, {
    urlParams,
    cache: "no-store",
  }).then((lessons) => lessons[0]);
}

export async function markLessonAsComplete(
  enrollmentId: string,
  completedLessonIds: number[],
  lessonId: number,
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/enrollments/${enrollmentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          data: {
            viewedLessons: [...completedLessonIds, lessonId],
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error response:", error);
      throw new Error("Failed to mark lesson as complete");
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/(droplets)/d/[slug]/[lessonSlug]", "page");
    revalidatePath("/(playlists)/p/[slug]", "page");

    return true;
  } catch (error) {
    console.error("Error marking lesson as complete:", error);
    return false;
  }
}

export async function completeLesson(activityId: number, lessonIds: number[]) {
  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL +
        `/api/authorized-user-activities/${activityId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            lessons: lessonIds,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to complete lesson");
    }

    revalidatePath("/(droplets)/d/[slug]/[lessonSlug]");
    return { success: true };
  } catch (error) {
    console.error("Error completing lesson:", error);
    return { success: false, error };
  }
}

export async function deleteLesson(
  id: number,
  revalidate: boolean = true,
) {
  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/lessons/" + id,
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

    if (revalidate) {
      revalidateTag("droplets");
    }

    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Lesson." };
  }
}

export async function updateLesson(
  id: number,
  data: Partial<z.infer<typeof LessonSchema>>,
  options: { reload?: boolean; regenerateSlug?: boolean } = {
    reload: false,
    regenerateSlug: false,
  },
) {
  try {
    if (data.blocks) {
      data.blocks = data.blocks.map(({ id, ...rest }) => rest);
    }
    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.blocks && { blocks: data.blocks }),
      ...(data.orderIndex && { orderIndex: data.orderIndex }),
    };
    dataToSend.regenerateSlug = options.regenerateSlug;

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/lessons/" + id,
      {
        method: "PUT",
        body: JSON.stringify({ data: dataToSend }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }

    if (options.reload) {
      revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
    }

    if (data.name) {
      revalidateTag("droplets");
    }

    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    };
  }
}

export async function revalidateLesson() {
  revalidateTag("lesson");
  revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
}

const CreateLessonSchema = LessonSchema.pick({
  name: true,
  dropletId: true,
  orderIndex: true,
});
export async function addLesson(formData: z.infer<typeof CreateLessonSchema>) {
  try {
    const lessonData = {
      name: formData.name,
      slug: "random", //autogenerated but must be defined
      blocks: [],
      droplets: {
        connect: [formData.dropletId],
      },
      orderIndex: formData.orderIndex
    };

    const lessonResponse = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/lessons",
      {
        method: "POST",
        body: JSON.stringify({ data: lessonData }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    const lessonResult = await lessonResponse.json();

    if (!lessonResponse.ok || lessonResult.error) {
      return { ok: false, error: lessonResult.error?.message, data: null };
    }

    revalidateTag("droplets");
    return { ok: true, error: null, data: lessonResult.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create lesson." };
  }
}
