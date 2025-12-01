"use server";
import { Droplet, Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, stripHtmlTags } from "../utils";
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

export async function deleteLesson(id: number, revalidate: boolean = true) {
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
      ...(data.name && { name: stripHtmlTags(data.name) }),
      ...(data.slug && { slug: data.slug }),
      ...(data.blocks && { blocks: data.blocks }),
      ...(data.blocksV2 && { blocksV2: data.blocksV2 }),
      ...(data.blocksVersion && { blocksVersion: data.blocksVersion }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
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
      orderIndex: formData.orderIndex,
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

export async function duplicateLessonToDroplet(
  sourceLessonId: number,
  targetDropletId: number,
  newOrderIndex: number,
) {
  try {
    // Fetch the source lesson with all its data including blocksV2 and blocksVersion
    const sourceLesson = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/lessons/${sourceLessonId}?populate[blocks][populate][questions][populate]=answerOptions&fields=*`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!sourceLesson.ok) {
      throw new Error("Failed to fetch source lesson");
    }

    const sourceLessonData = await sourceLesson.json();

    if (!sourceLessonData.data) {
      throw new Error("Source lesson not found");
    }

    const lesson = sourceLessonData.data.attributes;

    console.log("Source lesson data:", {
      blocksVersion: lesson.blocksVersion,
      hasBlocksV2: !!lesson.blocksV2,
      hasBlocks: !!lesson.blocks,
      blocksV2Sample: lesson.blocksV2
        ? JSON.stringify(lesson.blocksV2).substring(0, 200)
        : null,
    });

    // Helper function to remove ids from blocks while preserving structure
    const cleanBlocks = (blocks: any[]): any[] => {
      if (!Array.isArray(blocks)) {
        return [];
      }

      return blocks.map((block) => {
        const { id, ...blockWithoutId } = block;

        switch (block.__component) {
          case "droplets.quiz":
            if (block.questions) {
              return {
                ...blockWithoutId,
                questions: block.questions.map((q: any) => {
                  const { id: qId, ...questionWithoutId } = q;
                  return {
                    ...questionWithoutId,
                    answerOptions:
                      q.answerOptions?.map((a: any) => {
                        const { id: aId, ...answerWithoutId } = a;
                        return answerWithoutId;
                      }) || [],
                  };
                }),
              };
            }
            return blockWithoutId;

          case "droplets.open-ended-quiz":
            if (block.questions) {
              return {
                ...blockWithoutId,
                questions: block.questions.map((q: any) => {
                  const { id: qId, ...questionWithoutId } = q;
                  return questionWithoutId;
                }),
              };
            }
            return blockWithoutId;

          case "droplets.callout":
            if (block.content && Array.isArray(block.content)) {
              return {
                ...blockWithoutId,
                content: block.content.map((node: any) => {
                  const { id: nodeId, ...nodeWithoutId } = node;
                  if (
                    nodeWithoutId.children &&
                    Array.isArray(nodeWithoutId.children)
                  ) {
                    nodeWithoutId.children = nodeWithoutId.children.map(
                      (child: any) => {
                        const { id: childId, ...childWithoutId } = child;
                        return childWithoutId;
                      },
                    );
                  }
                  return nodeWithoutId;
                }),
              };
            }
            return blockWithoutId;

          case "droplets.generic":
          case "droplets.expandable":
          case "droplets.video":
          default:
            return blockWithoutId;
        }
      });
    };

    // Generate unique slug for the duplicated lesson
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const uniqueSlug = `${lesson.slug}-copy-${timestamp}-${randomSuffix}`;

    // Determine which version of blocks to use
    const blocksVersion = lesson.blocksVersion || "v1";
    const isV2 = blocksVersion === "v2";

    // Prepare lesson data based on version
    const lessonData: any = {
      name: `${lesson.name} (Copy)`,
      slug: uniqueSlug,
      type: lesson.type,
      orderIndex: newOrderIndex,
      notes: lesson.notes || null,
      blocksVersion: blocksVersion,
      droplets: {
        connect: [targetDropletId],
      },
    };

    // Add the appropriate blocks field
    if (isV2 && lesson.blocksV2) {
      // For v2 lessons, copy the blocksV2 JSON directly
      lessonData.blocksV2 = lesson.blocksV2;
      console.log(
        "Copying v2 blocks, length:",
        JSON.stringify(lesson.blocksV2).length,
      );
    } else if (lesson.blocks) {
      // For v1 lessons, clean the blocks array
      lessonData.blocks = cleanBlocks(lesson.blocks);
      console.log("Copying v1 blocks, count:", lessonData.blocks.length);
    }

    console.log("Lesson data to send:", {
      name: lessonData.name,
      blocksVersion: lessonData.blocksVersion,
      hasBlocksV2: !!lessonData.blocksV2,
      hasBlocks: !!lessonData.blocks,
    });

    const response = await fetch(NEXT_PUBLIC_STRAPI_API_URL + "/api/lessons", {
      method: "POST",
      body: JSON.stringify({ data: lessonData }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error("Failed to create lesson:", responseData.error);
      return {
        ok: false,
        error: responseData.error?.message || "Failed to duplicate lesson",
        data: null,
      };
    }

    console.log("Created lesson successfully:", responseData.data.id);

    revalidateTag("droplets");
    revalidatePath("(editing)/draft/d/[slug]", "page");

    return {
      ok: true,
      error: null,
      data: responseData.data,
    };
  } catch (err) {
    console.error("Error duplicating lesson:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Database Error: Failed to duplicate lesson.",
      data: null,
    };
  }
}
