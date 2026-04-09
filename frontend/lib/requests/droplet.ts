"use server";

import { Droplet } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { revalidateTag } from "next/cache";
import { deleteLesson } from "./lesson";
import { DropletSchema } from "../validations/droplet";
import { z } from "zod";
import { getCurrentUser } from "../auth/session";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getEnrollmentByUserAndDroplet } from "./enrollment";
import { CACHE_TAGS } from "../cache-tags";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the first 25 Droplets matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getDroplets({
  sort,
  filters = { isHidden: false },
  pagination = { pageSize: 100, page: 1 },
  populate = {
    tags: true,
    lessons: {
      fields: ["id", "name", "slug"],
    },
  },
  fields = ["*"],
}: StrapiRequestParams = {}): Promise<Droplet[]> {
  const path = `/droplets`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };
  const retVal = await fetchAPI<Droplet[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  });
  return retVal;
}

/**
 * Gets the desired Droplet by its unique slug.
 * @param slug The unique slug of the desired Droplet.
 * @param options Strapi query modifiers.
 * @returns The Droplet.
 */
export async function getDropletBySlug<T extends Partial<Droplet> = Droplet>(
  slug: string,
  {
    sort,
    filters,
    populate = { "*": true },
    fields = ["*", "isHidden", "originalDropletId"],
  }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/droplets`;
  const resolvedPopulate =
    typeof populate === "object" ? populate : { populate: "*" };
  const existingLessons =
    resolvedPopulate && typeof resolvedPopulate === "object"
      ? (resolvedPopulate as Record<string, any>).lessons ?? {}
      : {};
  const urlParams = {
    sort,
    filters: { ...filters, slug },
    populate: {
      ...resolvedPopulate,
      lessons: {
        ...(typeof existingLessons === "object" ? existingLessons : {}),
        sort: ["orderIndex:asc"],
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
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  }).then((droplets) => droplets[0]);
}

export async function getDropletById<T extends Partial<Droplet> = Droplet>(
  id: number,
  {
    sort,
    filters,
    populate = { "*": true },
    fields = ["*", "isHidden", "originalDropletId"],
  }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/droplets/${id}`;
  const urlParams = {
    sort,
    filters: { ...filters },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  }).then((droplet) => droplet);
}

export async function getDraftDroplets(): Promise<Droplet[]> {
  return await getDroplets({
    filters: { status: "draft" },
  });
}

export async function getInReviewDroplets(): Promise<Droplet[]> {
  return await getDroplets({
    filters: { inReview: true, status: "draft" },
  });
}

/**
 * Gets all published droplets with fun facts.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getRandomFunFactDroplet({
  sort,
  filters = {
    isHidden: false,
    funFact: { $ne: null },
  },
  pagination = { pageSize: 1000, page: 1 },
  populate,
  fields = ["id", "name", "slug", "funFact"],
}: StrapiRequestParams = {}): Promise<Droplet[]> {
  const path = `/droplets`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };
  const retVal = await fetchAPI<Droplet[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  });
  return retVal;
}

export async function updateDropletAverageRating(
  rating: number,
  dropletId: number,
) {
  try {
    const clamped = Math.min(
      5,
      Math.max(0, Number.isFinite(rating) ? rating : 0),
    );
    const rounded = Math.round(clamped * 10) / 10;
    const response = await fetch(
      `${STRAPI_API_URL}/api/droplets/${dropletId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            averageRating: rounded,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update average rating");
    }
    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.allEnrollments);
    return { success: true };
  } catch (error) {
    console.error("Error updating average rating:", error);
    return { success: false, error };
  }
}

export async function updateDropletFunFact(fact: string, dropletId: number) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/droplets/${dropletId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            funFact: fact,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update fun fact");
    }
    revalidateTag(CACHE_TAGS.droplets);
    return { success: true };
  } catch (error) {
    console.error("Error updating fun fact:", error);
    return { success: false, error };
  }
}

export async function deepDeleteDroplet(id: number) {
  try {
    const droplet = await getDropletById<Droplet>(id, {
      fields: ["id", "name", "slug"],
      populate: {
        authorized_users: { fields: ["id"] },
        learningObjectives: { fields: ["id"] },
        lessons: { fields: ["id"] },
        tags: { fields: ["id"] },
        prerequisites: { fields: ["id"] },
        postrequisites: { fields: ["id"] },
        nextSteps: { fields: ["id"] },
      },
    });

    if (droplet.lessons) {
      for (const lesson of droplet.lessons) {
        await deleteLesson(lesson.id, false);
      }
    }

    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: "Failed to delete droplet.", data: null };
    }

    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.allEnrollments);
    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.allGroups);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Droplet." };
  }
}

export async function updateDroplet(
  id: number,
  data: Partial<z.infer<typeof DropletSchema>>,
  options: { regenerateSlug?: boolean } = {
    regenerateSlug: false,
  },
) {
  try {
    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.focusArea && { focusArea: data.focusArea }),
      ...(data.type && { type: data.type }),
      ...(data.difficulty !== undefined && {
        difficulty: data.difficulty || null,
      }),
      ...(data.authorized_users && { authorized_users: data.authorized_users }),
      ...(data.tagIds && { tags: data.tagIds }),
      ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
      ...(data.learningObjectives && {
        learningObjectives: data.learningObjectives.map((obj) => ({
          objective: obj,
        })),
      }),
      ...(data.prerequisiteIds && { prerequisites: data.prerequisiteIds }),
      ...(data.postrequisiteIds && { postrequisites: data.postrequisiteIds }),
      ...(data.nextSteps && { nextSteps: data.nextSteps }),
      ...(data.datasets !== undefined && { datasets: data.datasets }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.overview !== undefined && { overview: data.overview }),
      ...(data.lessons && { lessons: data.lessons }),
      ...(data.inReview !== undefined && { inReview: data.inReview }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.afterReview !== undefined && { afterReview: data.afterReview }),
    };

    dataToSend.regenerateSlug = options.regenerateSlug;

    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      // Better error handling
      let errorMessage = responseData.error?.message || "Unknown error";

      // Try to get detailed error path if it exists
      try {
        if (responseData.error?.details?.errors?.[0]?.path?.[0]) {
          const errorPath = responseData.error.details.errors[0].path[0];
          errorMessage = `${responseData.error.message} (${errorPath})`;
        }
      } catch (e) {
        // If we can't access the error path, just use the main error message
      }

      console.error("Update failed with error:", errorMessage);
      console.error(
        "Full error response:",
        JSON.stringify(responseData, null, 2),
      );
      return { ok: false, error: errorMessage, data: null };
    }

    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.allEnrollments);
    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.allGroups);
    revalidateTag(CACHE_TAGS.userContent);
    revalidateTag(CACHE_TAGS.userDashboard);

    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error("Exception in updateDroplet:", err);
    return {
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    };
  }
}

export async function archiveDroplet(droplet: Droplet, archiveState: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollment = await getEnrollmentByUserAndDroplet(
      authorizedUser.id,
      droplet.id,
    );
    if (!enrollment) throw new Error("Not enrolled in this droplet");
    const response = await fetch(
      `${STRAPI_API_URL}/api/enrollments/${enrollment.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            isArchived: archiveState,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to archive droplet");
    }
    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    return { success: true };
  } catch (error) {
    console.error("Error archiving droplet:", error);
    return { success: false, error };
  }
}

export async function createNewTag(tag: string) {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          name: tag,
          slug: tag.replace(/\s/g, ""),
        },
      }),
    });

    if (!response.ok) {
      console.error("adding tag failed:", await response.text());
      return { success: false, error: "Failed to add new tag" };
    }

    const result = await response.json();
    const createdTag = result.data;

    revalidateTag(CACHE_TAGS.tags);
    return {
      success: true,
      data: {
        id: createdTag.id,
        name: createdTag.attributes.name,
        slug: createdTag.attributes.slug,
        droplets: [],
      },
    };
  } catch (error) {
    console.error("Error adding tag:", error);
    return { success: false, error: "Failed to process request" };
  }
}

const CreateDropletSchema = DropletSchema.pick({
  name: true,
  focusArea: true,
  type: true,
  tagIds: true,
  learningObjectives: true,
  difficulty: true,
});

export async function createDroplet(data: z.infer<typeof CreateDropletSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorizedUserByEmail(user.email, {
      populate: {},
    });
    if (!author) throw new Error("No author identified");

    const dataToSend = {
      name: data.name,
      slug: "random", // this gets overwritten when created, but just has to be defined as something
      focusArea: data.focusArea,
      type: data.type,
      difficulty: data.difficulty,
      tags: {
        connect: data.tagIds,
      },
      authorized_users: {
        connect: [author.id],
      },

      learningObjectives: data.learningObjectives.map((obj) => ({
        objective: obj,
      })),
    };

    // ensure no duplicate droplets made regardless of casing from the $eqi
    const existingDroplets = await getDroplets({
      filters: { name: { $eqi: data.name } },
      fields: ["name"],
      pagination: { pageSize: 1, page: 1 },
    });

    if (existingDroplets && existingDroplets.length > 0) {
      return {
        ok: false,
        error: "This attribute must be unique (name)",
        data: null,
      };
    }

    const response = await fetch(STRAPI_API_URL + "/api/droplets", {
      method: "POST",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.userContent);
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create droplet.",
      data: null,
    };
  }
}

export async function duplicateDroplet(dropletId: number) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorizedUserByEmail(user.email, {
      populate: {},
    });
    if (!author) throw new Error("No author identified");

    // Fetch the original droplet with all its data
    const originalDroplet = await getDropletById<Droplet>(dropletId, {
      fields: ["*"],
      populate: {
        tags: true,
        learningObjectives: true,
        authorized_users: { fields: ["id"] },
        lessons: {
          fields: ["*"], // Add this to get all lesson fields including blocksV2 and blocksVersion
          populate: {
            blocks: {
              populate: {
                questions: {
                  populate: ["answerOptions"],
                },
              },
            },
          },
          sort: ["orderIndex:asc"],
        },
        prerequisites: true,
        postrequisites: true,
        nextSteps: true,
      },
    });

    if (!originalDroplet) {
      throw new Error("Original droplet not found");
    }

    console.log("Checking for existing edit draft...");
    console.log("Current user ID:", author.id);
    console.log("Original droplet ID:", dropletId);
    console.log("Original droplet name:", originalDroplet.name);

    // Check if an edit draft already exists - simplified approach
    try {
      // Get all drafts with this originalDropletId
      const url = `${STRAPI_API_URL}/api/droplets?filters[originalDropletId][$eq]=${dropletId}&filters[status][$eq]=draft&populate[authorized_users][fields][0]=id&fields[0]=id&fields[1]=name&fields[2]=slug&fields[3]=originalDropletId`;

      console.log("Checking URL:", url);

      const existingDraftsResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      });

      const existingDraftsData = await existingDraftsResponse.json();

      console.log("API Response status:", existingDraftsResponse.status);
      console.log("API Response:", JSON.stringify(existingDraftsData, null, 2));

      if (existingDraftsResponse.ok && existingDraftsData.data) {
        console.log(
          `Found ${existingDraftsData.data.length} draft(s) with originalDropletId=${dropletId}`,
        );

        for (const draft of existingDraftsData.data) {
          console.log("Checking draft:", {
            id: draft.id,
            name: draft.attributes?.name,
            slug: draft.attributes?.slug,
            authorizedUsers: draft.attributes?.authorized_users?.data?.map(
              (u: any) => u.id,
            ),
          });

          const authorizedUserIds =
            draft.attributes?.authorized_users?.data?.map((u: any) => u.id) ||
            [];
          console.log("Draft authorized users:", authorizedUserIds);
          console.log(
            "Current user is authorized?",
            authorizedUserIds.includes(author.id),
          );

          if (authorizedUserIds.includes(author.id)) {
            console.log(
              "✓ Found existing edit draft for current user:",
              draft.id,
            );

            return {
              ok: true,
              error: null,
              data: {
                id: draft.id,
                attributes: {
                  slug: draft.attributes.slug,
                  name: draft.attributes.name,
                },
              },
              isExisting: true,
            };
          }
        }

        console.log("No drafts found where current user is authorized");
      }
    } catch (error) {
      console.error("Error checking for existing draft:", error);
    }

    console.log("No existing draft found, creating new one...");

    // Get existing authors and add current user if not already included
    const existingAuthorIds =
      originalDroplet.authorized_users?.map((u) => u.id) || [];
    const authorIds = existingAuthorIds.includes(author.id)
      ? existingAuthorIds
      : [...existingAuthorIds, author.id];

    console.log("Authors for new draft:", authorIds);

    // Generate a truly unique slug
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const uniqueSlug = `draft-${timestamp}-${randomSuffix}`;

    // Create the new droplet with [EDIT] prefix and store original droplet ID
    const newDropletData = {
      name: `[EDIT] ${originalDroplet.name}`,
      slug: uniqueSlug,
      focusArea: originalDroplet.focusArea,
      type: originalDroplet.type,
      ...(originalDroplet.difficulty
        ? { difficulty: originalDroplet.difficulty }
        : {}),
      description: originalDroplet.description,
      overview: originalDroplet.overview,
      status: "draft",
      originalDropletId: dropletId,
      tags: {
        connect: originalDroplet.tags?.map((tag) => tag.id) || [],
      },
      authorized_users: {
        connect: authorIds,
      },
      learningObjectives:
        originalDroplet.learningObjectives?.map((obj) => ({
          objective: obj.objective,
        })) || [],
      prerequisites: {
        connect: originalDroplet.prerequisites?.map((p) => p.id) || [],
      },
      postrequisites: {
        connect: originalDroplet.postrequisites?.map((p) => p.id) || [],
      },
      nextSteps: originalDroplet.nextSteps || [],
    };

    console.log("Creating droplet with slug:", uniqueSlug);

    // Create the new droplet
    const dropletResponse = await fetch(STRAPI_API_URL + "/api/droplets", {
      method: "POST",
      body: JSON.stringify({ data: newDropletData }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const dropletResponseData = await dropletResponse.json();

    if (!dropletResponse.ok || dropletResponseData.error) {
      console.error(
        "Droplet creation error details:",
        JSON.stringify(dropletResponseData, null, 2),
      );
      throw new Error(
        dropletResponseData.error?.message || "Failed to create droplet",
      );
    }

    const newDropletId = dropletResponseData.data.id;
    console.log("Created new droplet with ID:", newDropletId);

    // Helper function to remove ids from blocks while preserving structure
    const cleanBlocks = (blocks: any[]): any[] => {
      if (!Array.isArray(blocks)) {
        console.log("Blocks is not an array:", blocks);
        return [];
      }

      console.log(`Cleaning ${blocks.length} blocks`);

      return blocks.map((block, index) => {
        console.log(`Block ${index}:`, block.__component);
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

    // Duplicate all lessons
    if (originalDroplet.lessons && originalDroplet.lessons.length > 0) {
      console.log(`Duplicating ${originalDroplet.lessons.length} lessons`);

      const sortedLessons = [...originalDroplet.lessons].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );

      await Promise.all(
        sortedLessons.map(async (lesson, index) => {
          const lessonTimestamp = Date.now();
          const lessonRandomSuffix = Math.random()
            .toString(36)
            .substring(2, 15);
          const uniqueLessonSlug = `lesson-${lessonTimestamp}-${lessonRandomSuffix}`;

          // Determine which version of blocks to use
          const blocksVersion = lesson.blocksVersion || "v1";
          const isV2 = blocksVersion === "v2";

          console.log(
            `Lesson: ${lesson.name}, blocksVersion: ${blocksVersion}`,
          );

          // Prepare lesson data based on version
          const lessonData: any = {
            name: lesson.name,
            slug: uniqueLessonSlug,
            type: lesson.type,
            orderIndex: index,
            blocksVersion: blocksVersion,
            notes: lesson.notes || null,
            droplets: [newDropletId],
          };

          // Add the appropriate blocks field
          if (isV2 && lesson.blocksV2) {
            // For v2 lessons, copy the blocksV2 JSON directly
            lessonData.blocksV2 = lesson.blocksV2;
            console.log(
              `Creating v2 lesson: ${lesson.name} with blocksV2 data`,
            );
          } else {
            // For v1 lessons, clean the blocks array
            const cleanedBlocks = cleanBlocks(lesson.blocks || []);
            lessonData.blocks = cleanedBlocks;
            console.log(
              `Creating v1 lesson: ${lesson.name} with ${cleanedBlocks.length} blocks`,
            );
          }

          const response = await fetch(STRAPI_API_URL + "/api/lessons", {
            method: "POST",
            body: JSON.stringify({ data: lessonData }),
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              "Failed to create lesson:",
              JSON.stringify(errorData, null, 2),
            );
            throw new Error(`Failed to create lesson: ${lesson.name}`);
          }

          const createdLesson = await response.json();
          console.log(
            `Created lesson ${createdLesson.data.id} (${blocksVersion})`,
          );
        }),
      );
    }

    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.allEnrollments);
    revalidateTag(CACHE_TAGS.userContent);

    return {
      ok: true,
      error: null,
      data: dropletResponseData.data,
      isExisting: false,
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Database Error: Failed to duplicate droplet.",
      data: null,
      isExisting: false,
    };
  }
}

export async function publishDraftToOriginal(
  draftDropletId: number,
  originalDropletId: number,
) {
  let author: { id: number } | null = null;
  let dbWritesStarted = false;
  let draftEnrollments: { data?: any[] } = {};
  let originalSlug: string | null = null;

  try {
    console.log("Starting publishDraftToOriginal", {
      draftDropletId,
      originalDropletId,
    });

    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email, {
      populate: {},
    });
    if (!authorizedUser) throw new Error("No author identified");
    author = authorizedUser;

    console.log("Fetching draft droplet...");
    // Fetch the draft droplet with all its data
    const draftDroplet = await getDropletById<Droplet>(draftDropletId, {
      fields: ["*"],
      populate: {
        tags: { fields: ["id", "name"] },
        learningObjectives: { fields: ["*"] },
        lessons: {
          fields: ["*"], // Get all lesson fields including blocksV2 and blocksVersion
          populate: {
            blocks: {
              populate: {
                questions: {
                  populate: ["answerOptions"],
                },
              },
            },
          },
          sort: ["orderIndex:asc"],
        },
        prerequisites: { fields: ["id", "name", "slug"] },
        postrequisites: { fields: ["id", "name", "slug"] },
        nextSteps: { fields: ["*"] },
      },
    });

    if (!draftDroplet) {
      throw new Error("Draft droplet not found");
    }
    console.log("Draft droplet fetched:", draftDroplet.id);

    console.log("Fetching original droplet...");
    // Fetch the original droplet to get its lessons for deletion
    const originalDroplet = await getDropletById<Droplet>(originalDropletId, {
      fields: ["*"],
      populate: {
        lessons: {
          fields: ["id", "name", "slug"],
        },
      },
    });

    if (!originalDroplet) {
      throw new Error("Original droplet not found");
    }
    originalSlug = originalDroplet.slug;
    console.log(
      "Original droplet fetched:",
      originalDroplet.id,
      "with",
      originalDroplet.lessons?.length || 0,
      "lessons",
    );

    // Fail fast before any destructive writes if required fields are missing
    if (draftDroplet.difficulty == null) {
      throw new Error(
        "Draft droplet is missing a difficulty. Set it in the editor before publishing.",
      );
    }

    // Fetch draft enrollments before DB writes begin
    draftEnrollments = await fetch(
      `${STRAPI_API_URL}/api/enrollments?filters[droplet][id][$eq]=${draftDropletId}&populate[authorizedUser][fields][0]=id`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    ).then((res) => res.json());

    dbWritesStarted = true;

    // Delete all lessons from the original droplet
    if (originalDroplet.lessons && originalDroplet.lessons.length > 0) {
      console.log(
        `Deleting ${originalDroplet.lessons.length} lessons from original droplet`,
      );

      for (const lesson of originalDroplet.lessons) {
        try {
          console.log(`Deleting lesson ${lesson.id}...`);
          await deleteLesson(lesson.id, false);
          console.log(`Deleted lesson ${lesson.id}`);
        } catch (error) {
          console.error(`Error deleting lesson ${lesson.id}:`, error);
          // Continue with other lessons even if one fails
        }
      }
    }

    // Update the original droplet with draft data
    const updatedName = draftDroplet.name.replace(/^\[EDIT\]\s*/i, "");

    const updateData: any = {
      name: updatedName,
      status: "published",
    };

    // Only add fields that exist and are valid
    if (draftDroplet.focusArea) updateData.focusArea = draftDroplet.focusArea;
    if (draftDroplet.type) updateData.type = draftDroplet.type;
    if (draftDroplet.difficulty !== undefined)
      updateData.difficulty = draftDroplet.difficulty;
    if (draftDroplet.description !== undefined)
      updateData.description = draftDroplet.description;
    if (draftDroplet.overview !== undefined)
      updateData.overview = draftDroplet.overview;

    if (draftDroplet.tags && draftDroplet.tags.length > 0) {
      updateData.tagIds = draftDroplet.tags.map((tag) => tag.id);
    }

    if (
      draftDroplet.learningObjectives &&
      draftDroplet.learningObjectives.length > 0
    ) {
      // Clean learning objectives - remove ids and extract just the objective text
      updateData.learningObjectives = draftDroplet.learningObjectives.map(
        (obj: any) => {
          if (typeof obj === "string") {
            return obj;
          }
          return obj.objective || obj;
        },
      );
    }

    if (draftDroplet.prerequisites && draftDroplet.prerequisites.length > 0) {
      updateData.prerequisiteIds = draftDroplet.prerequisites.map((p) => p.id);
    }

    if (draftDroplet.postrequisites && draftDroplet.postrequisites.length > 0) {
      updateData.postrequisiteIds = draftDroplet.postrequisites.map(
        (p) => p.id,
      );
    }

    if (draftDroplet.nextSteps && draftDroplet.nextSteps.length > 0) {
      // Remove id fields from nextSteps components
      updateData.nextSteps = draftDroplet.nextSteps.map((step: any) => {
        const { id, __component, ...stepWithoutId } = step;
        // Keep __component if it exists, remove id
        return __component ? { __component, ...stepWithoutId } : stepWithoutId;
      });
    }

    console.log(
      "Updating original droplet with data:",
      JSON.stringify(updateData, null, 2),
    );
    const updateResult = await updateDroplet(originalDropletId, updateData, {
      regenerateSlug: false,
    });

    if (!updateResult.ok) {
      console.error("Failed to update droplet:", updateResult.error);
      throw new Error(
        updateResult.error || "Failed to update original droplet",
      );
    }

    console.log("Updated original droplet successfully");

    try {
      console.log("Updating enrollments to point to original droplet");

      // Update each enrollment to point to the original droplet
      await Promise.all(
        (draftEnrollments.data || []).map(async (enrollment) => {
          const res = await fetch(
            `${STRAPI_API_URL}/api/enrollments/${enrollment.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                data: {
                  droplet: originalDropletId,
                },
              }),
            },
          );
          if (!res.ok) {
            console.error(
              `Failed to update enrollment ${enrollment.id}: ${res.status}`,
            );
          } else {
            console.log(
              `Updated enrollment ${enrollment.id} to point to original droplet`,
            );
          }
        }),
      );
    } catch (error) {
      console.error("Error updating enrollments:", error);
    }

    // Helper function to remove ids from blocks
    const cleanBlocks = (blocks: any[]): any[] => {
      if (!Array.isArray(blocks)) return [];

      return blocks.map((block) => {
        const { id, ...blockWithoutId } = block;

        if (block.__component === "droplets.quiz" && block.questions) {
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

        if (
          block.__component === "droplets.open-ended-quiz" &&
          block.questions
        ) {
          return {
            ...blockWithoutId,
            questions: block.questions.map((q: any) => {
              const { id: qId, ...questionWithoutId } = q;
              return questionWithoutId;
            }),
          };
        }

        return blockWithoutId;
      });
    };

    // Create lessons from draft in the original droplet
    if (draftDroplet.lessons && draftDroplet.lessons.length > 0) {
      console.log(
        `Creating ${draftDroplet.lessons.length} lessons in original droplet`,
      );

      // Sort lessons by orderIndex to ensure correct order
      const sortedLessons = [...draftDroplet.lessons].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );

      await Promise.all(
        sortedLessons.map(async (lesson, index) => {
          // Determine which version of blocks to use
          const blocksVersion = lesson.blocksVersion || "v1";
          const isV2 = blocksVersion === "v2";

          console.log(
            `Lesson: ${lesson.name}, blocksVersion: ${blocksVersion}`,
          );

          // Generate new unique slug for the lesson
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 10);

          // Prepare lesson data based on version
          const lessonData: any = {
            name: lesson.name,
            slug: `${lesson.slug}-${timestamp}-${randomSuffix}`,
            type: lesson.type,
            orderIndex: index,
            blocksVersion: blocksVersion,
            notes: lesson.notes || null,
            droplets: [originalDropletId],
          };

          // Add the appropriate blocks field
          if (isV2 && lesson.blocksV2) {
            // For v2 lessons, copy the blocksV2 JSON directly
            lessonData.blocksV2 = lesson.blocksV2;
            console.log(
              `Creating v2 lesson: ${lesson.name} with blocksV2 data`,
            );
          } else {
            // For v1 lessons, clean the blocks array
            const cleanedBlocks = cleanBlocks(lesson.blocks || []);
            lessonData.blocks = cleanedBlocks;
            console.log(
              `Creating v1 lesson: ${lesson.name} with ${cleanedBlocks.length} blocks`,
            );
          }

          console.log(
            `Creating lesson: ${lesson.name} with orderIndex: ${index}`,
          );
          const response = await fetch(STRAPI_API_URL + "/api/lessons", {
            method: "POST",
            body: JSON.stringify({ data: lessonData }),
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              "Failed to create lesson:",
              JSON.stringify(errorData, null, 2),
            );
            throw new Error(`Failed to create lesson: ${lesson.name}`);
          }

          console.log(
            `Successfully created lesson: ${lesson.name} with orderIndex: ${index}`,
          );
        }),
      );
    }

    console.log("Successfully merged lessons, now deleting draft droplet");

    // Delete the draft droplet
    try {
      await deepDeleteDroplet(draftDropletId);
      console.log("Draft droplet deleted successfully");
    } catch (error) {
      console.error("Error deleting draft droplet:", error);
      console.warn(
        "Draft droplet was not deleted but changes were published successfully",
      );
    }

    console.log("publishDraftToOriginal completed successfully");
    return { ok: true, error: null, slug: originalSlug };
  } catch (err) {
    console.error("Full error in publishDraftToOriginal:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Database Error: Failed to publish draft.",
      slug: null,
    };
  } finally {
    if (dbWritesStarted) {
      revalidateTag(CACHE_TAGS.authors);
      revalidateTag(CACHE_TAGS.droplets);
      revalidateTag(CACHE_TAGS.lesson);
      revalidateTag(CACHE_TAGS.playlists);
      revalidateTag(CACHE_TAGS.allEnrollments);
      revalidateTag(CACHE_TAGS.allGroups);
      revalidateTag(CACHE_TAGS.userContent);
      revalidateTag(CACHE_TAGS.userDashboard);
    }
  }
}

export async function favoriteDroplet(
  droplet: Droplet,
  favoriteState: boolean,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");

    const authorizedUser = await getAuthorizedUserByEmail(user.email);

    // Fetch the latest droplet state to minimize race conditions
    const latestDropletResponse = await fetch(
      `${STRAPI_API_URL}/api/droplets/${droplet.id}?populate=usersFavorited`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!latestDropletResponse.ok) {
      throw new Error("Failed to fetch latest droplet state");
    }

    const latestDroplet = await latestDropletResponse.json();
    const currentFavorites =
      latestDroplet.data.attributes.usersFavorited?.data || [];

    let updatedFavorites;
    if (favoriteState) {
      // Add user to favorites if not already there
      if (!currentFavorites.some((u: any) => u.id === authorizedUser.id)) {
        updatedFavorites = [
          ...currentFavorites.map((u: any) => u.id),
          authorizedUser.id,
        ];
      } else {
        updatedFavorites = currentFavorites.map((u: any) => u.id);
      }
    } else {
      // Remove user from favorites
      updatedFavorites = currentFavorites
        .filter((u: any) => u.id !== authorizedUser.id)
        .map((u: any) => u.id);
    }

    const response = await fetch(
      `${STRAPI_API_URL}/api/droplets/${droplet.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            usersFavorited: updatedFavorites,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update favorite status");
    }

    revalidateTag(CACHE_TAGS.droplets);
    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    return { success: true };
  } catch (error) {
    console.error("Error updating favorite status:", error);
    return { success: false, error };
  }
}

export async function updateDropletLearningObjective(
  dropletId: number,
  oldObjective: string,
  newObjective: string,
) {
  try {
    // Fetch current droplet with learning objectives
    const droplet = await getDropletById<Droplet>(dropletId, {
      fields: ["*"],
      populate: {
        learningObjectives: true,
      },
    });

    if (!droplet) {
      throw new Error("Droplet not found");
    }

    // Update the specific objective
    const updatedObjectives =
      droplet.learningObjectives?.map((obj) =>
        obj.objective === oldObjective ? newObjective : obj.objective,
      ) || [];

    // Update the droplet
    const response = await fetch(
      `${STRAPI_API_URL}/api/droplets/${dropletId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            learningObjectives: updatedObjectives.map((obj) => ({
              objective: obj,
            })),
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update learning objective");
    }

    revalidateTag(CACHE_TAGS.droplets);
    return { success: true };
  } catch (error) {
    console.error("Error updating learning objective:", error);
    return { success: false, error };
  }
}
