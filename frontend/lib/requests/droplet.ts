"use server";

import { Droplet, Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "../utils";
import { revalidateTag } from "next/cache";
import { deleteLesson } from "./lesson";
import { DropletSchema } from "../validations/droplet";
import { z } from "zod";
import { getCurrentUser } from "../auth/session";
import { requireRole } from "../auth/require-role";
import { withAuth, assertOwner } from "../auth/guards";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getEnrollmentByUserAndDroplet } from "./enrollment";
import { CACHE_TAGS } from "../cache-tags";
import { planLessonSync, type LessonSyncPlan } from "../lesson-sync";

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
    populate = {},
    fields = ["*", "isHidden", "originalDropletId"],
  }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/droplets`;
  const resolvedPopulate = typeof populate === "object" ? populate : {};
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

/**
 * Gets the desired Droplet by its id.
 * @param id The id of the desired Droplet.
 * @param options Strapi query modifiers.
 * @param fresh Skip the data cache. Publishing an edit diffs the latest saved
 * lessons, and lesson autosaves skip revalidation, so a cached read can be stale.
 * @returns The Droplet.
 */
export async function getDropletById<T extends Partial<Droplet> = Droplet>(
  id: number,
  {
    sort,
    filters,
    populate = {},
    fields = ["*", "isHidden", "originalDropletId"],
  }: StrapiRequestParams = {},
  { fresh = false }: { fresh?: boolean } = {},
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
    ...(fresh
      ? { cache: "no-store" as const }
      : { next: { tags: [CACHE_TAGS.droplets], revalidate: 900 } }),
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
    status: "published",
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
    // Intentionally no revalidation. This only writes the aggregate
    // averageRating, which may be up to the 900s TTL stale for everyone.
    // Flushing `droplets` + the global enrollments sweep here emptied the
    // explore/droplet/dashboard caches for every user on every rating. The
    // rater's own rating (and isComplete) is refreshed by
    // changeEnrollmentRating via the per-user enrollments tag.
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: "Failed to delete droplet.", data: null };
    }

    revalidateTag(CACHE_TAGS.authors);
    revalidateTag(CACHE_TAGS.droplets);
    // Lessons were deleted above with revalidate=false; getLessonBySlug is
    // tagged only with `lesson`, so flush it here.
    revalidateTag(CACHE_TAGS.lesson);
    revalidateTag(CACHE_TAGS.allEnrollments);
    revalidateTag(CACHE_TAGS.playlists);
    revalidateTag(CACHE_TAGS.allGroups);
    revalidateTag(CACHE_TAGS.allUserContent);
    revalidateTag(CACHE_TAGS.allUserDashboards);
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
      ...(data.presentationEnabled !== undefined && {
        presentationEnabled: data.presentationEnabled,
      }),
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
        ...STRAPI_RESPONSE_FORMAT_HEADER,
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

    // Draft saves (the editor autosaves on a 1s debounce) skip sweeps for
    // caches that can never contain a status="draft" droplet:
    //  - playlists / user-dashboard: every playlist droplet picker only offers
    //    published droplets, and no app flow moves a droplet back to "draft".
    //  - groups: the group droplet picker excludes drafts.
    //  - authors: creator lists only hold droplet ids, so they change only
    //    when authorized_users changes.
    // Still swept: droplets (the editor reads through it), enrollments
    // (/d/[slug] has no status gate, so drafts can have enrollments), and
    // user-content (every co-author's /my-content lists the draft).
    // A save that sets `status` always gets the full sweep, since the
    // previous status is unknown here.
    const isDraftSave =
      data.status === undefined &&
      responseData.data?.attributes?.status === "draft";

    revalidateTag(CACHE_TAGS.droplets);
    if (!isDraftSave || data.authorized_users) {
      revalidateTag(CACHE_TAGS.authors);
    }
    revalidateTag(CACHE_TAGS.allEnrollments);
    if (!isDraftSave) {
      revalidateTag(CACHE_TAGS.playlists);
      revalidateTag(CACHE_TAGS.allGroups);
      revalidateTag(CACHE_TAGS.allUserDashboards);
    }
    // Publishing a claimed voyage droplet finishes the claim (the droplet
    // lifecycle marks its voyage node "authored"), so voyage maps must refetch.
    if (data.status === "published") {
      revalidateTag(CACHE_TAGS.voyages);
    }
    revalidateTag(CACHE_TAGS.allUserContent);

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

export async function togglePresentationEnabled(
  dropletId: number,
  enabled: boolean,
) {
  return withAuth([], async (user) => {
    const droplet = await getDropletById(dropletId, {
      fields: ["id"],
      populate: { authorized_users: { fields: ["id"] } },
    });

    const owner = assertOwner(
      droplet?.authorized_users?.map((u) => u.id),
      user,
    );
    if (!owner.ok) return { ok: false, error: owner.error, data: null };

    return updateDroplet(dropletId, { presentationEnabled: enabled });
  });
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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

export async function setDropletHidden(dropletId: number, hidden: boolean) {
  const gate = await requireRole([]);
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const droplet = await getDropletById(dropletId, {
      fields: ["id"],
      populate: { authorized_users: { fields: ["id"] } },
    });

    const owner = assertOwner(
      droplet?.authorized_users?.map((u) => u.id),
      gate.user,
    );
    if (!owner.ok) return { success: false, error: "forbidden" };

    const result = await updateDroplet(dropletId, { isHidden: hidden });
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error("Error setting droplet hidden:", error);
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
        ...STRAPI_RESPONSE_FORMAT_HEADER,
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
        ...STRAPI_RESPONSE_FORMAT_HEADER,
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
    // The creator is the new droplet's only author, and a brand-new droplet
    // isn't in anyone's playlists, so only their /my-content changes.
    revalidateTag(CACHE_TAGS.userContent(author.id));
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

    // Fetch the original droplet with all its data. Read it fresh: edits made
    // directly to a live droplet autosave without revalidating, so a cached read
    // could clone stale content that publish would later write back.
    const originalDroplet = await getDropletById<Droplet>(
      dropletId,
      {
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
      },
      { fresh: true },
    );

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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
        ...STRAPI_RESPONSE_FORMAT_HEADER,
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
            // Lineage: lets publish match this clone back to the live lesson it
            // came from, so that lesson keeps its id and its students' progress.
            originalLessonId: lesson.id,
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
              ...STRAPI_RESPONSE_FORMAT_HEADER,
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
    // The new draft shows up on /my-content for exactly its authors (the
    // original's authors plus the current user); it isn't in any playlist.
    for (const authorId of authorIds) {
      revalidateTag(CACHE_TAGS.userContent(authorId));
    }

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

/** The message in a Strapi error response, plus the field it points at when there is one. */
function strapiErrorMessage(body: any, fallback: string): string {
  const message = body?.error?.message;
  if (!message) return fallback;
  const field = body.error.details?.errors?.[0]?.path?.[0];
  return field ? `${message} (${field})` : message;
}

/** Sends one lesson PUT or POST. Throws Strapi's error message if the write didn't go through. */
async function writeLesson(
  method: "PUT" | "POST",
  path: string,
  data: object,
): Promise<void> {
  const response = await fetch(STRAPI_API_URL + path, {
    method,
    body: JSON.stringify({ data }),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
  });
  // A gateway error page isn't JSON, so don't let a parse error hide the status
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) {
    throw new Error(
      strapiErrorMessage(body, `Strapi responded with ${response.status}`),
    );
  }
}

/** `lesson "Name": reason`: the part of a publish error that says which lesson failed and why. */
function lessonFailure(lessonName: string, cause: unknown): string {
  const reason = cause instanceof Error ? cause.message : String(cause);
  return `lesson "${lessonName}": ${reason}`;
}

/**
 * Writes a lesson sync plan to the original droplet (ODY-622): updates the matched
 * lessons in place, creates the new ones, then deletes the removed ones.
 *
 * Deleting comes last and only runs once every update and create has succeeded, so
 * a failure never leaves students with fewer lessons than before. Updates and
 * creates run one at a time and stop at the first failure. Every delete is
 * attempted before a failure is reported. Publishing again is safe after any
 * failure: updates are idempotent, and a lesson created earlier is matched by name.
 *
 * Throws a message meant for the author. Not exported, so it isn't a server action.
 */
async function applyLessonSync(
  plan: LessonSyncPlan,
  originalDropletId: number,
  draftLessons: Pick<Lesson, "id" | "slug">[],
): Promise<void> {
  // Send only what changed, and never slug, notes or relations: the lesson keeps
  // its URL and everything students attached to it.
  for (const update of plan.updates) {
    try {
      await writeLesson(
        "PUT",
        `/api/lessons/${update.liveLessonId}`,
        update.changes,
      );
    } catch (error) {
      throw new Error(
        `Publishing stopped partway (${lessonFailure(update.name, error)}). No lessons were removed. Publish again to finish.`,
      );
    }
  }

  const draftSlugs = new Map<number, string>(
    draftLessons.map((lesson): [number, string] => [lesson.id, lesson.slug]),
  );
  for (const create of plan.creates) {
    // Strapi requires a slug on create, but the lesson lifecycle's beforeCreate always
    // replaces it with one generated from the name, so this value is never stored.
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const placeholderSlug = `${draftSlugs.get(create.draftLessonId) ?? "lesson"}-${timestamp}-${randomSuffix}`;

    try {
      await writeLesson("POST", "/api/lessons", {
        ...create.data,
        slug: placeholderSlug,
        droplets: [originalDropletId],
      });
    } catch (error) {
      throw new Error(
        `Publishing stopped partway (${lessonFailure(create.name, error)}). No lessons were removed. Publish again to finish.`,
      );
    }
  }

  const notRemoved: string[] = [];
  for (const lesson of plan.deletes) {
    try {
      const result = await deleteLesson(lesson.liveLessonId, false);
      // Its catch path returns { error } without ok, so anything but ok === true failed
      if (result?.ok !== true) {
        notRemoved.push(
          lessonFailure(lesson.name, result?.error ?? "unknown error"),
        );
      }
    } catch (error) {
      notRemoved.push(lessonFailure(lesson.name, error));
    }
  }
  if (notRemoved.length > 0) {
    throw new Error(
      `Publishing stopped partway (could not remove ${notRemoved.join("; ")}). Publish again to finish.`,
    );
  }
}

/**
 * Publishes an [EDIT] draft over the live droplet it was cloned from (ODY-622).
 *
 * The live lessons are updated in place instead of being deleted and recreated, so
 * their ids and slugs, and everything keyed to them (students' viewedLessons, notes,
 * highlights), survive. Order of operations:
 *  1. Read the draft and the original fresh, run the guards and plan the lesson
 *     sync. Nothing is written yet.
 *  2. Update the original droplet's metadata.
 *  3. Update the matched lessons, create the new ones, then delete the removed ones.
 *  4. Move the draft's own enrollments, then delete the draft.
 * A failure in 2 or 3 returns { ok: false } and keeps the draft, and publishing
 * again finishes the job.
 */
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

    // Both sides of the lesson sync need every lesson field (content and lineage
    // included) with the blocks populated.
    const lessonsPopulate = {
      fields: ["*"], // Get all lesson fields including blocksV2, blocksVersion and originalLessonId
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
    };

    console.log("Fetching draft droplet...");
    // Fetch the draft droplet with all its data. Both reads skip the data cache:
    // lesson autosaves don't revalidate it, so a cached read could hold stale
    // lessons and the sync would silently skip the author's latest edits.
    const draftDroplet = await getDropletById<Droplet>(
      draftDropletId,
      {
        fields: ["*"],
        populate: {
          tags: { fields: ["id", "name"] },
          learningObjectives: { fields: ["*"] },
          lessons: lessonsPopulate,
          prerequisites: { fields: ["id", "name", "slug"] },
          postrequisites: { fields: ["id", "name", "slug"] },
          nextSteps: { fields: ["*"] },
        },
      },
      { fresh: true },
    );

    if (!draftDroplet) {
      throw new Error("Draft droplet not found");
    }
    console.log("Draft droplet fetched:", draftDroplet.id);

    console.log("Fetching original droplet...");
    // Fetch the original droplet with its lessons, to sync them with the draft's
    const originalDroplet = await getDropletById<Droplet>(
      originalDropletId,
      {
        fields: ["*"],
        populate: { lessons: lessonsPopulate },
      },
      { fresh: true },
    );

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

    const draftLessons = draftDroplet.lessons ?? [];
    const originalLessons = originalDroplet.lessons ?? [];

    // An empty draft would delete every live lesson, which is almost certainly a mistake
    if (draftLessons.length === 0 && originalLessons.length > 0) {
      throw new Error(
        "This draft has no lessons. Add at least one lesson before publishing.",
      );
    }

    // Decide what to update, create and delete before anything is written
    const plan = planLessonSync(draftLessons, originalLessons);

    // Strapi would reject an emptied lesson too, but only part way through publishing
    const emptiedLesson = plan.updates.find(
      (update) =>
        Array.isArray(update.changes.blocks) &&
        update.changes.blocks.length === 0,
    );
    if (emptiedLesson) {
      throw new Error(
        `Lesson "${emptiedLesson.name}" has no content. Add content or delete the lesson before publishing.`,
      );
    }

    console.log(
      `Lesson sync: ${plan.updates.length} to update, ${plan.unchanged.length} unchanged, ${plan.creates.length} to create, ${plan.deletes.length} to delete`,
    );

    // Fetch draft enrollments before DB writes begin
    draftEnrollments = await fetch(
      `${STRAPI_API_URL}/api/enrollments?filters[droplet][id][$eq]=${draftDropletId}&populate[authorizedUser][fields][0]=id`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
      },
    ).then((res) => res.json());

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
    // The first write: from here on the caches are flushed even if publishing fails
    dbWritesStarted = true;
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

    // Update the matched lessons in place, create the new ones, then delete the
    // removed ones. A failure throws before the draft's enrollments are moved or
    // the draft is deleted, so publishing can simply be tried again.
    await applyLessonSync(plan, originalDropletId, draftLessons);

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
                ...STRAPI_RESPONSE_FORMAT_HEADER,
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
      revalidateTag(CACHE_TAGS.allUserContent);
      revalidateTag(CACHE_TAGS.allUserDashboards);
    }
  }
}

/**
 * Gets the ids of the Droplets a user has favorited.
 * @param userId The authorized user's id.
 * @returns The favorited Droplet ids.
 */
export async function getFavoritedDropletIds(
  userId: number,
): Promise<number[]> {
  const [user] = await fetchAPI<{ dropletsFavorited?: { id: number }[] }[]>(
    "/authorized-users",
    {
      urlParams: {
        filters: { id: { $eq: userId } },
        fields: ["id"],
        populate: { dropletsFavorited: { fields: ["id"] } },
      },
      next: { tags: [CACHE_TAGS.favorites(userId)], revalidate: 900 },
    },
  );
  return user?.dropletsFavorited?.map((d) => d.id) ?? [];
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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

    // Per-user only: favorite state is read through getFavoritedDropletIds
    // (explore) and the per-user enrollments favorites preset, so the global
    // droplets cache doesn't need to be flushed for everyone.
    revalidateTag(CACHE_TAGS.favorites(authorizedUser.id));
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
          ...STRAPI_RESPONSE_FORMAT_HEADER,
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
