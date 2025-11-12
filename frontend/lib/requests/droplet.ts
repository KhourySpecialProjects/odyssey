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
    fields = ["*", "isHidden"],
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
    fields = ["*", "isHidden"],
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
      ...(data.description && { description: data.description }),
      ...(data.overview && { overview: data.overview }),
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
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
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
    console.error(err);
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
      learningObjectives: originalDroplet.learningObjectives?.map((obj) => ({
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
      console.error("Droplet creation error details:", JSON.stringify(dropletResponseData, null, 2));
      throw new Error(dropletResponseData.error?.message || "Failed to create droplet");
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
        
        // Create a copy without the id field
        const { id, ...blockWithoutId } = block;
        
        // Handle nested structures (like quiz questions with ids)
        if (block.__component === "droplets.quiz" && block.questions) {
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
        
        if (block.__component === "droplets.open-ended-quiz" && block.questions) {
          return {
            ...blockWithoutId,
            questions: block.questions.map((q: any) => {
              const { id: qId, ...questionWithoutId } = q;
              return questionWithoutId;
            })
          };
        }
        
        return blockWithoutId;
      });
    };

    // Duplicate all lessons
    if (originalDroplet.lessons && originalDroplet.lessons.length > 0) {
      console.log(`Duplicating ${originalDroplet.lessons.length} lessons`);
      
      for (const lesson of originalDroplet.lessons) {
        const lessonTimestamp = Date.now();
        const lessonRandomSuffix = Math.random().toString(36).substring(2, 15);
        const uniqueLessonSlug = `lesson-${lessonTimestamp}-${lessonRandomSuffix}`;
        
        console.log("Original lesson blocks:", lesson.blocks?.length || 0, "blocks");
        
        const cleanedBlocks = cleanBlocks(lesson.blocks || []);
        
        const lessonData = {
          name: lesson.name,
          slug: uniqueLessonSlug,
          type: lesson.type,
          orderIndex: lesson.orderIndex,
          blocks: cleanedBlocks,
          droplets: [newDropletId],
        };

        console.log(`Creating lesson: ${lesson.name} with ${cleanedBlocks.length} blocks`);

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
        console.log(`Created lesson with ${createdLesson.data.attributes.blocks?.length || 0} blocks`);

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
      error: err instanceof Error ? err.message : "Database Error: Failed to duplicate droplet.",
      data: null,
    };
  }
}

export async function publishDraftToOriginal(draftDropletId: number, originalDropletId: number) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorizedUserByEmail(user.email, {
      populate: {},
    });
    if (!author) throw new Error("No author identified");

    // Fetch the draft droplet with all its data
    const draftDroplet = await getDropletById<Droplet>(draftDropletId, {
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

    if (!draftDroplet) {
      throw new Error("Draft droplet not found");
    }

    // Fetch the original droplet to get its lessons for deletion
    const originalDroplet = await getDropletById<Droplet>(originalDropletId, {
      fields: ["*"],
      populate: {
        lessons: {
          populate: "*",
        },
      },
    });

    if (!originalDroplet) {
      throw new Error("Original droplet not found");
    }

    // Delete all lessons from the original droplet
    if (originalDroplet.lessons && originalDroplet.lessons.length > 0) {
      console.log(`Deleting ${originalDroplet.lessons.length} lessons from original droplet`);
      
      for (const lesson of originalDroplet.lessons) {
        await deleteLesson(lesson.id, false);
      }
    }

    // Update the original droplet with draft data (remove "[EDIT]- " prefix from name)
    const updatedName = draftDroplet.name.replace(/^\[EDIT\]-\s*/i, "");
    
    const updateData = {
      name: updatedName,
      focusArea: draftDroplet.focusArea,
      type: draftDroplet.type,
      description: draftDroplet.description,
      overview: draftDroplet.overview,
      status: "published",
      tagIds: draftDroplet.tags?.map((tag) => tag.id) || [],
      learningObjectives: draftDroplet.learningObjectives?.map((obj) => obj.objective) || [],
      prerequisiteIds: draftDroplet.prerequisites?.map((p) => p.id) || [],
      postrequisiteIds: draftDroplet.postrequisites?.map((p) => p.id) || [],
      nextSteps: draftDroplet.nextSteps || [],
    };

    const updateResult = await updateDroplet(originalDropletId, updateData, {
      regenerateSlug: false,
      revalidate: true,
    });

    if (!updateResult.ok) {
      throw new Error(updateResult.error || "Failed to update original droplet");
    }

    console.log("Updated original droplet, now creating new lessons");

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
                answerOptions: q.answerOptions?.map((a: any) => {
                  const { id: aId, ...answerWithoutId } = a;
                  return answerWithoutId;
                }) || []
              };
            })
          };
        }
        
        if (block.__component === "droplets.open-ended-quiz" && block.questions) {
          return {
            ...blockWithoutId,
            questions: block.questions.map((q: any) => {
              const { id: qId, ...questionWithoutId } = q;
              return questionWithoutId;
            })
          };
        }
        
        return blockWithoutId;
      });
    };

    // Create lessons from draft in the original droplet
    if (draftDroplet.lessons && draftDroplet.lessons.length > 0) {
      console.log(`Creating ${draftDroplet.lessons.length} lessons in original droplet`);
      
      for (const lesson of draftDroplet.lessons) {
        const cleanedBlocks = cleanBlocks(lesson.blocks || []);
        
        const lessonData = {
          name: lesson.name,
          slug: lesson.slug,
          type: lesson.type,
          orderIndex: lesson.orderIndex,
          blocks: cleanedBlocks,
          droplets: [originalDropletId],
        };

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

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log("Successfully merged lessons, now deleting draft droplet");

    // Delete the draft droplet
    await deepDeleteDroplet(draftDropletId);

    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/my-content", "page");
    revalidatePath(`/d/${originalDroplet.slug}`, "page");
    
    return { ok: true, error: null, slug: originalDroplet.slug };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database Error: Failed to publish draft.",
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
