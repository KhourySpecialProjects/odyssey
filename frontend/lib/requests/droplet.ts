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
          populate: "*",
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

    // Create the new droplet with DRAFT prefix
    const newDropletData = {
      name: `DRAFT ${originalDroplet.name}`,
      slug: "random", // will be regenerated
      focusArea: originalDroplet.focusArea,
      type: originalDroplet.type,
      description: originalDroplet.description,
      overview: originalDroplet.overview,
      status: "draft",
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
      throw new Error(dropletResponseData.error?.message || "Failed to create droplet");
    }

    const newDropletId = dropletResponseData.data.id;

    // Helper function to remove ids from blocks while preserving structure
    const cleanBlocks = (blocks: any[]): any[] => {
      if (!Array.isArray(blocks)) return [];
      
      return blocks.map((block) => {
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
      const lessonPromises = originalDroplet.lessons.map(async (lesson) => {
        const lessonData = {
          name: lesson.name,
          slug: "random", // will be regenerated
          type: lesson.type,
          orderIndex: lesson.orderIndex,
          blocks: cleanBlocks(lesson.blocks),
          droplets: [newDropletId],
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
          console.error("Failed to create lesson:", errorData);
          throw new Error(`Failed to create lesson: ${lesson.name}`);
        }

        return response;
      });

      await Promise.all(lessonPromises);
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
