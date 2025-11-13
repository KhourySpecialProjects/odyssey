"use server";

import { Droplet } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { deleteLesson } from "./lesson";
import { DropletSchema } from "../validations/droplet";
import { z } from "zod";
import { getCurrentUser } from "../auth/session";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";

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
  const urlParams = {
    sort,
    filters: { ...filters, slug },
    populate: {
      ...(typeof populate === "object" ? populate : { populate: "*" }),
      lessons: {
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
    revalidateTag("droplets");
    revalidatePath("/(droplets)/d/[slug]", "page");
    revalidatePath("/(general)/dashboard", "page");
    revalidatePath("/(playlists)/p/[slug]", "page");
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
    return { success: true };
  } catch (error) {
    console.error("Error updating fun fact:", error);
    return { success: false, error };
  }
}

export async function deepDeleteDroplet(id: number) {
  try {
    const droplet = await getDropletById<Droplet>(id, {
      fields: ["*"],
      populate: {
        authorized_users: { populate: "*" },
        learningObjectives: { populate: "*" },
        lessons: { populate: "*" },
        tags: { populate: "*" },
        prerequisites: { populate: ["id", "name", "slug"] },
        postrequisites: { populate: ["id", "name", "slug"] },
        nextSteps: { fields: ["label", "url"] },
      },
    });

    if (droplet.lessons) {
      droplet.lessons.forEach((lesson) => {
        deleteLesson(lesson.id, false);
      });
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

    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/my-content", "page");
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Droplet." };
  }
}

export async function updateDroplet(
  id: number,
  data: Partial<z.infer<typeof DropletSchema>>,
  options: { regenerateSlug?: boolean; revalidate?: boolean } = {
    regenerateSlug: false,
    revalidate: false,
  },
) {
  try {
    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.focusArea && { focusArea: data.focusArea }),
      ...(data.type && { type: data.type }),
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
      ...(data.description !== undefined && { description: data.description }),
      ...(data.overview !== undefined && { overview: data.overview }),
      ...(data.lessons && { lessons: data.lessons }),
      ...(data.inReview !== undefined && { inReview: data.inReview }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.afterReview !== undefined && { afterReview: data.afterReview }),
    };

    dataToSend.regenerateSlug = options.regenerateSlug;

    console.log(
      "Sending update to Strapi:",
      JSON.stringify(dataToSend, null, 2),
    );

    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const responseData = await response.json();

    console.log("Strapi response:", JSON.stringify(responseData, null, 2));

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

    if (
      dataToSend.isHidden !== undefined ||
      dataToSend.name ||
      options.revalidate
    ) {
      revalidateTag("droplets");
      revalidatePath("/admin");
    }

    revalidateTag("authors");
    revalidatePath("(general)/my-content", "page");
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
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    const toArchive = enrollments.filter((e) => e.droplet.id === droplet.id);
    const response = await fetch(
      `${STRAPI_API_URL}/api/enrollments/${toArchive[0].id}`,
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
    revalidateTag("dashboard");
    revalidatePath("/");
    revalidatePath("/draft");
    revalidatePath(`/d/${droplet.slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/archived");
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

    revalidatePath("/new/droplet");
    revalidatePath("/draft/d/[slug]/[lessonSlug]", "page");
    return { success: true };
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
    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/my-content", "page");
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
        lessons: {
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

    // Generate a truly unique slug
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const uniqueSlug = `draft-${timestamp}-${randomSuffix}`;

    // Create the new droplet with [EDIT]- prefix and store original droplet ID
    const newDropletData = {
      name: `[EDIT]- ${originalDroplet.name}`,
      slug: uniqueSlug,
      focusArea: originalDroplet.focusArea,
      type: originalDroplet.type,
      description: originalDroplet.description,
      overview: originalDroplet.overview,
      status: "draft",
      originalDropletId: dropletId, // Store the original droplet ID
      tags: {
        connect: originalDroplet.tags?.map((tag) => tag.id) || [],
      },
      authorized_users: {
        connect: [author.id],
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
        
        // Always remove the id field from the block itself
        const { id, ...blockWithoutId } = block;
        
        // Handle different block types
        switch (block.__component) {
          case "droplets.quiz":
            if (block.questions) {
              return {
                ...blockWithoutId,
                questions: block.questions.map((q: any) => {
                  const { id: qId, ...questionWithoutId } = q;
                  return {
                    ...questionWithoutId,
                    answerOptions: q.answerOptions?.map((a: any) => {
                      const { id: aId, ...answerWithoutId } = a;
                      return answerWithoutId;
                    }) || []
                  };
                })
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
                })
              };
            }
            return blockWithoutId;
          
          case "droplets.callout":
            // Callout has content which might be BlockNode[] with nested structure
            if (block.content && Array.isArray(block.content)) {
              return {
                ...blockWithoutId,
                content: block.content.map((node: any) => {
                  const { id: nodeId, ...nodeWithoutId } = node;
                  // Also clean children if they exist
                  if (nodeWithoutId.children && Array.isArray(nodeWithoutId.children)) {
                    nodeWithoutId.children = nodeWithoutId.children.map((child: any) => {
                      const { id: childId, ...childWithoutId } = child;
                      return childWithoutId;
                    });
                  }
                  return nodeWithoutId;
                })
              };
            }
            return blockWithoutId;
          
          case "droplets.generic":
          case "droplets.expandable":
          case "droplets.video":
          default:
            // These are simple blocks, just return without id
            return blockWithoutId;
        }
      });
    };

    // Duplicate all lessons
    if (originalDroplet.lessons && originalDroplet.lessons.length > 0) {
      console.log(`Duplicating ${originalDroplet.lessons.length} lessons`);
      
      // Sort lessons by orderIndex to ensure correct order
      const sortedLessons = [...originalDroplet.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
      
      for (let index = 0; index < sortedLessons.length; index++) {
        const lesson = sortedLessons[index];
        const lessonTimestamp = Date.now();
        const lessonRandomSuffix = Math.random().toString(36).substring(2, 15);
        const uniqueLessonSlug = `lesson-${lessonTimestamp}-${lessonRandomSuffix}`;
        
        console.log("Original lesson blocks:", lesson.blocks?.length || 0, "blocks");
        
        const cleanedBlocks = cleanBlocks(lesson.blocks || []);
        
        const lessonData = {
          name: lesson.name,
          slug: uniqueLessonSlug,
          type: lesson.type,
          orderIndex: index, // Use the array index to ensure sequential ordering (0, 1, 2, ...)
          blocks: cleanedBlocks,
          droplets: [newDropletId],
        };

        console.log(`Creating lesson: ${lesson.name} with orderIndex: ${index}`);

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
          console.error("Failed to create lesson:", JSON.stringify(errorData, null, 2));
          throw new Error(`Failed to create lesson: ${lesson.name}`);
        }

        const createdLesson = await response.json();
        console.log(`Created lesson with ${createdLesson.data.attributes.blocks?.length || 0} blocks and orderIndex: ${index}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/my-content", "page");

    return { ok: true, error: null, data: dropletResponseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Database Error: Failed to duplicate droplet.",
      data: null,
    };
  }
}

export async function publishDraftToOriginal(
  draftDropletId: number,
  originalDropletId: number,
) {
  try {
    console.log("Starting publishDraftToOriginal", {
      draftDropletId,
      originalDropletId,
    });

    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorizedUserByEmail(user.email, {
      populate: {},
    });
    if (!author) throw new Error("No author identified");

    console.log("Fetching draft droplet...");
    // Fetch the draft droplet with all its data - using simpler populate
    const draftDroplet = await getDropletById<Droplet>(draftDropletId, {
      fields: ["*"],
      populate: {
        tags: { fields: ["id", "name"] },
        learningObjectives: { fields: ["*"] },
        lessons: {
          fields: ["*"],
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
    console.log(
      "Original droplet fetched:",
      originalDroplet.id,
      "with",
      originalDroplet.lessons?.length || 0,
      "lessons",
    );

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
    const updatedName = draftDroplet.name.replace(/^\[EDIT\]-\s*/i, "");

    const updateData: any = {
      name: updatedName,
      status: "published",
    };

    // Only add fields that exist and are valid
    if (draftDroplet.focusArea) updateData.focusArea = draftDroplet.focusArea;
    if (draftDroplet.type) updateData.type = draftDroplet.type;
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
      revalidate: true,
    });

    if (!updateResult.ok) {
      console.error("Failed to update droplet:", updateResult.error);
      throw new Error(
        updateResult.error || "Failed to update original droplet",
      );
    }

    console.log("Updated original droplet successfully");

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
      console.log(`Creating ${draftDroplet.lessons.length} lessons in original droplet`);
      
      // Sort lessons by orderIndex to ensure correct order
      const sortedLessons = [...draftDroplet.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
      
      for (let index = 0; index < sortedLessons.length; index++) {
        const lesson = sortedLessons[index];
        try {
          const cleanedBlocks = cleanBlocks(lesson.blocks || []);
          
          // Generate new unique slug for the lesson
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          
          const lessonData = {
            name: lesson.name,
            slug: `${lesson.slug}-${timestamp}-${randomSuffix}`,
            type: lesson.type,
            orderIndex: index, // Use the array index to ensure sequential ordering
            blocks: cleanedBlocks,
            droplets: [originalDropletId],
          };

          console.log(`Creating lesson: ${lesson.name} with orderIndex: ${index}`);
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
            console.error("Failed to create lesson:", JSON.stringify(errorData, null, 2));
            throw new Error(`Failed to create lesson: ${lesson.name}`);
          }

          console.log(`Successfully created lesson: ${lesson.name} with orderIndex: ${index}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error creating lesson ${lesson.name}:`, error);
          throw error;
        }
      }
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

    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/my-content", "page");
    revalidatePath(`/d/${originalDroplet.slug}`, "page");

    console.log("publishDraftToOriginal completed successfully");
    return { ok: true, error: null, slug: originalDroplet.slug };
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

    revalidateTag("dashboard");
    revalidateTag("droplets");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/favorited");
    revalidatePath(`/d/${droplet.slug}`);
    revalidatePath("/dashboard", "page");
    revalidatePath("/", "page");
    revalidateTag("enrollments");
    revalidateTag("droplets");
    return { success: true };
  } catch (error) {
    console.error("Error updating favorite status:", error);
    return { success: false, error };
  }
}
