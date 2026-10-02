"use server";

import { Enrollment, Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import qs from "qs";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "../utils";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidateTag } from "next/cache";
import { Droplet } from "@/types";
import { DropletEnrollmentSchema } from "../validations/enrollment";
import { z } from "zod";
import { CACHE_TAGS } from "../cache-tags";
import { enrollmentNeedsCompletionBackfill } from "../enrollment-completion";
import {
  EntryRef,
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "../strapi-document-id";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Builds the ref passed to the documentId helper: the caller's enrollment id,
 * plus the fetched enrollment's documentId when we have it (skips the lookup).
 */
function enrollmentRef(
  enrollmentId: string,
  fetched?: { documentId?: string } | null,
): EntryRef {
  return { id: enrollmentId, documentId: fetched?.documentId };
}

/**
 * PUTs `data` to an enrollment and returns the flattened enrollment from the
 * response; `responseQuery` (fields/populate) shapes what comes back.
 * `enrollment` is the enrollment id, or a ref carrying its documentId.
 */
async function putEnrollment(
  enrollment: EntryRef,
  data: Record<string, unknown>,
  responseQuery?: Record<string, unknown>,
): Promise<Partial<Enrollment>> {
  const query = responseQuery
    ? qs.stringify(responseQuery, { encodeValuesOnly: true })
    : undefined;
  const response = await fetch(
    await strapiEntryUrl("enrollments", enrollment, query),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({ data }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to update enrollment: ${response.status}`);
  }
  const json = await response.json();
  return flattenAttributes(json.data);
}

/**
 * Gets the first 25 enrollments matching the specified criteria, unless overridden by `options`.
 * @param options Strapi query modifiers.
 * @returns The matching Droplets.
 */
export async function getEnrollmentsByAuthorizedUser(
  authorizedUserId: number,
  {
    sort,
    filters,
    pagination = { pageSize: 250, page: 1 },
    populate = ENROLLMENT_POPULATES.minimal,
    fields = [
      "id",
      "rating",
      "isComplete",
      "isFirstTime",
      "isArchived",
      "completionDate",
    ],
  }: StrapiRequestParams = {},
): Promise<Enrollment[]> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      $and: [
        filters,
        { authorizedUser: { id: { $eq: authorizedUserId } } },
        { droplet: { id: { $notNull: true } } },
      ],
    },
    populate,
    fields,
    pagination,
  };
  return await fetchAPI<Enrollment[]>(path, {
    urlParams,
    next: {
      tags: [
        CACHE_TAGS.enrollments(authorizedUserId),
        CACHE_TAGS.allEnrollments,
      ],
      revalidate: 900,
    },
  });
}

/**
 * Fetches enrollments for multiple members filtered to specific droplets in a
 * single paginated Strapi query. Replaces N per-member calls with 1 batched call.
 */
export async function getEnrollmentsForGroupMembers(
  memberIds: number[],
  groupDropletIds: number[],
  {
    populate = {
      droplet: {
        populate: { lessons: { fields: ["id", "name", "slug"] } },
        fields: ["id"],
      },
      viewedLessons: { fields: ["id", "name", "slug"] },
      authorizedUser: { fields: ["id"] },
    },
    fields = ["id", "isComplete", "completionDate"],
  }: { populate?: Record<string, any>; fields?: string[] } = {},
): Promise<Enrollment[]> {
  const path = `/enrollments`;
  const pageSize = 250;
  let page = 1;
  let allEnrollments: Enrollment[] = [];

  while (true) {
    const urlParams = {
      filters: {
        $and: [
          { authorizedUser: { id: { $in: memberIds } } },
          { droplet: { id: { $in: groupDropletIds } } },
        ],
      },
      populate,
      fields,
      pagination: { page, pageSize },
    };

    const enrollmentsPage = await fetchAPI<Enrollment[]>(path, {
      urlParams,
      next: {
        tags: [
          ...memberIds.map((id) => CACHE_TAGS.enrollments(id)),
          CACHE_TAGS.allEnrollments,
        ],
        revalidate: 900,
      },
    });

    if (!enrollmentsPage || enrollmentsPage.length === 0) break;

    allEnrollments = allEnrollments.concat(enrollmentsPage);

    if (enrollmentsPage.length < pageSize) break;
    page++;
  }

  return allEnrollments;
}

/**
 * Determines if the given authorized user is enrolled in the given Droplet.
 * @param authorizedUserId The unique ID of the authorized user.
 * @param dropletId The unique ID of the Droplet.
 * @param options Strapi query modifiers.
 * @returns `true` if the authorized user is already enrolled in the Droplet, else `false`.
 */
/**
 * Fetches a single enrollment for a specific user and droplet.
 * Returns null if no enrollment exists.
 */
export async function getEnrollmentByUserAndDroplet(
  authorizedUserId: number,
  dropletId: number,
): Promise<Enrollment | null> {
  return fetchAPI<Enrollment[]>("/enrollments", {
    urlParams: {
      filters: {
        $and: [
          { authorizedUser: { id: { $eq: authorizedUserId } } },
          { droplet: { id: { $eq: dropletId } } },
        ],
      },
      fields: ["id", "isComplete", "isArchived"],
      populate: { viewedLessons: { fields: ["id"] } },
      pagination: { pageSize: 1, page: 1 },
    },
  }).then((enrollments) => enrollments[0] || null);
}

export async function changeEnrollmentRating(
  newRating: number,
  enrollmentID: string,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const [authorizedUser, enrollment] = await Promise.all([
      getAuthorizedUserByEmail(user.email),
      getEnrollByID(enrollmentID, {
        populate: { authorizedUser: { fields: ["id"] } },
        fields: ["id", "completionDate"],
      }),
    ]);

    if (!enrollment || enrollment.authorizedUser?.id !== authorizedUser?.id) {
      throw new Error("Enrollment not found for this user");
    }

    // Rating marks the droplet complete, so record when if it wasn't already
    // (pages no longer backfill completionDate during render).
    await putEnrollment(enrollmentRef(enrollmentID, enrollment), {
      rating: newRating,
      isComplete: true,
      ...(enrollment.completionDate ? {} : { completionDate: new Date() }),
    });

    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error in changeEnrollmentRating:", error);
    return { success: false, error: "Failed to rate enrollment" };
  }
}

/**
 * Gets the rating of the Enrollment with the given ID
 *  @param options Strapi query modifiers.
 * @returns The Enrollment with this ID..
 */
export async function getEnrollByID<T extends Partial<Enrollment> = Enrollment>(
  enrollID: string,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      id: { $eq: enrollID },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  try {
    return await fetchAPI<T[]>(path, {
      urlParams,
    }).then((enrollments) => enrollments[0]);
  } catch (error) {
    console.error("Error getting Enrollment from ID:", error);
    return Promise.reject(new Error("Try again"));
  }
}

/**
 * Calculates the average rating of a given Droplet from all its enrollments.
 * @param droplet The Droplet to calculate the average rating for
 * @returns The average rating or 0 if no ratings exist
 */
export async function calculateDropletAverageRating(
  droplet: Droplet,
): Promise<number> {
  const path = `/enrollments`;

  let page = 1;
  const pageSize = 250;
  let allEnrollments: Enrollment[] = [];

  try {
    while (true) {
      const urlParams = {
        filters: {
          droplet: { id: { $eq: droplet.id } },
          rating: { $notNull: true },
        },
        fields: ["rating"],
        pagination: {
          page,
          pageSize,
        },
      };

      const enrollmentsPage = await fetchAPI<Enrollment[]>(path, {
        urlParams,
      });

      if (!enrollmentsPage || enrollmentsPage.length === 0) {
        break;
      }

      allEnrollments = allEnrollments.concat(enrollmentsPage);

      // if fewer results than pageSize, this was the last page
      if (enrollmentsPage.length < pageSize) {
        break;
      }

      page++;
    }

    // If fewer than 5 ratings, return 0
    if (allEnrollments.length < 5) {
      return 0;
    }

    const totalRating = allEnrollments.reduce(
      (sum, enrollment) => sum + (enrollment.rating || 0),
      0,
    );

    return totalRating / allEnrollments.length;
  } catch (error) {
    console.error("Error calculating droplet average rating:", error);
    throw new Error("Error getting droplet average rating");
  }
}

//Gets just one enrollment but also returns the response metadata to get pagination data
export async function fetchEnrollmentMetadata({
  sort,
  filters,
  pagination = { pageSize: 1, page: 1 },
  populate,
  fields = ["id"],
}: StrapiRequestParams = {}): Promise<{
  data: Enrollment[];
  meta: {
    pagination: {
      page: number;
      pageCount: number;
      pageSize: number;
      total: number;
    };
  };
}> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };

  try {
    const response = await fetchAPI<{
      data: Enrollment[];
      meta: {
        pagination: {
          page: number;
          pageCount: number;
          pageSize: number;
          total: number;
        };
      };
    }>(path, {
      urlParams,
      cache: "no-store",
      flattenResponse: false,
    });

    return response;
  } catch (error) {
    console.error("Error fetching enrollment metadata:", error);
    return Promise.reject(new Error("Error getting enrollment metadata"));
  }
}

export async function updateEnrollmentFirstTime(enrollmentId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("User not authenticated");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);

    let url: string;
    try {
      url = await strapiEntryUrl("enrollments", enrollmentId);
    } catch (err) {
      // Same failure as the 404 Strapi used to return for a missing enrollment.
      if (err instanceof StrapiEntryNotFoundError) {
        throw new Error("Failed to update enrollment");
      }
      throw err;
    }
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: {
          isFirstTime: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update enrollment");
    }

    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    return await response.json();
  } catch (error) {
    console.error("Error updating enrollment:", error);
    throw error;
  }
}

export async function createEnrollmentFromEmail(
  formData: z.infer<typeof DropletEnrollmentSchema>,
  email: string,
) {
  try {
    const authorizedUser = await getAuthorizedUserByEmail(email);
    const existing = await getEnrollmentByUserAndDroplet(
      authorizedUser.id,
      formData.droplet,
    );

    if (!existing) {
      // Strapi v5 relation writes take documentIds.
      let relations: {
        droplet: string;
        viewedLessons: string[];
        authorizedUser: string;
      };
      try {
        relations = {
          droplet: await resolveDocumentId("droplets", formData.droplet),
          viewedLessons: await resolveDocumentIds(
            "lessons",
            formData.viewedLessons,
          ),
          authorizedUser: await resolveDocumentId(
            "authorized-users",
            authorizedUser,
          ),
        };
      } catch (err) {
        // Same result as Strapi rejecting a relation that does not exist.
        if (err instanceof StrapiEntryNotFoundError) {
          return { ok: false, error: err.message, data: null };
        }
        throw err;
      }

      const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          data: { ...formData, ...relations },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
      });
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }

      revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to enroll." };
  }
}

export async function deleteEnrollment(
  formData: z.infer<typeof DropletEnrollmentSchema>,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollment = await getEnrollmentByUserAndDroplet(
      authorizedUser.id,
      formData.droplet,
    );

    if (enrollment) {
      // A missing enrollment throws StrapiEntryNotFoundError, which the catch
      // below handles like the old 404 (whose body parsing also threw).
      const response = await fetch(
        await strapiEntryUrl("enrollments", enrollment),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
        },
      );
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }

      revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to unenroll." };
  }
}

export async function createEnrollment(
  droplet: Droplet,
  viewedLessons: Lesson[],
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const existing = await getEnrollmentByUserAndDroplet(
      authorizedUser.id,
      droplet.id,
    );

    if (!existing) {
      // Strapi v5 relation writes take documentIds. The entities usually carry
      // one already, so no lookup happens.
      let relations: {
        authorizedUser: string;
        droplet: string;
        viewedLessons: string[];
      };
      try {
        relations = {
          authorizedUser: await resolveDocumentId(
            "authorized-users",
            authorizedUser,
          ),
          droplet: await resolveDocumentId("droplets", droplet),
          viewedLessons: await resolveDocumentIds("lessons", viewedLessons),
        };
      } catch (err) {
        // Same result as Strapi rejecting a relation that does not exist.
        if (err instanceof StrapiEntryNotFoundError) {
          return { ok: false, error: err.message, data: null };
        }
        throw err;
      }

      const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          data: relations,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
      });
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }
      revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
      return { ok: true, error: null, data: data.data };
    }
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to enroll." };
  }
}

// create function to update viewed lessons and mark as isComplete if all lessons are viewed
export async function updateViewedLessons(
  enrollmentId: string,
  lessonId: number,
  allDropletLessonIds: number[],
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const [authorizedUser, enrollment] = await Promise.all([
      getAuthorizedUserByEmail(user.email),
      getEnrollByID(enrollmentId, {
        populate: {
          viewedLessons: { fields: ["id"] },
          droplet: {
            fields: ["id"],
            populate: { lessons: { fields: ["id"] } },
          },
          authorizedUser: { fields: ["id"] },
        },
        fields: ["id", "isComplete", "completionDate"],
      }),
    ]);

    if (!enrollment || enrollment.authorizedUser?.id !== authorizedUser?.id) {
      throw new Error("Enrollment not found for this user");
    }

    const viewedIds = enrollment.viewedLessons?.map((l: Lesson) => l.id) || [];
    const alreadyViewed = viewedIds.includes(lessonId);

    let finalViewedIds = viewedIds;
    let isComplete: boolean | undefined = enrollment.isComplete;
    let completionDate: Date | undefined = enrollment.completionDate;

    if (!alreadyViewed) {
      // `connect` adds this one lesson on the Strapi side. Rewriting the whole
      // list (read, append, PUT) let two overlapping saves - e.g. "Next"
      // clicked twice while the first save is still running - drop a lesson.
      // The response returns the list as stored after the write, so completion
      // below is judged on what Strapi actually holds.
      const lessonDocumentId = await resolveDocumentId("lessons", {
        id: lessonId,
        documentId: enrollment.droplet?.lessons?.find(
          (l: Lesson) => l.id === lessonId,
        )?.documentId,
      });
      const updated = await putEnrollment(
        enrollmentRef(enrollmentId, enrollment),
        { viewedLessons: { connect: [lessonDocumentId] } },
        {
          fields: ["isComplete", "completionDate"],
          populate: { viewedLessons: { fields: ["id"] } },
        },
      );
      finalViewedIds = updated.viewedLessons?.map((l: Lesson) => l.id) ?? [
        ...viewedIds,
        lessonId,
      ];
      isComplete = updated.isComplete;
      completionDate = updated.completionDate;
    }

    // The droplet's own lesson list is authoritative; the caller's copy is only
    // a fallback in case the relation didn't come back.
    const dropletLessonIds =
      enrollment.droplet?.lessons?.map((l: Lesson) => l.id) ??
      allDropletLessonIds;
    const isNowComplete =
      dropletLessonIds.length > 0 &&
      dropletLessonIds.every((id) => finalViewedIds.includes(id));

    // Completion is recorded here rather than during page render
    // (revalidateTag throws during render). Also backfills enrollments that
    // were marked complete before completionDate was tracked.
    const needsCompletionUpdate =
      isNowComplete && (!isComplete || !completionDate);

    if (needsCompletionUpdate) {
      await putEnrollment(enrollmentRef(enrollmentId, enrollment), {
        isComplete: true,
        ...(completionDate ? {} : { completionDate: new Date() }),
      });
    }

    if (!alreadyViewed || needsCompletionUpdate) {
      revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    }

    // When the droplet is newly completed, check if it belongs to a voyage node
    // and auto-complete that node. Fire-and-forget: do not block the response.
    const dropletId = enrollment.droplet?.id;
    if (isNowComplete && !enrollment.isComplete && dropletId) {
      import("./voyage-enrollment")
        .then(({ checkAndCompleteVoyageNode }) =>
          checkAndCompleteVoyageNode(dropletId, authorizedUser.id),
        )
        .catch((err) => {
          console.error("Voyage node completion failed (non-blocking):", err);
        });
    }

    return { success: true, alreadyViewed };
  } catch (error) {
    console.error("Error updating viewed lessons:", error);
    return { success: false, error: "Failed to update viewed lessons" };
  }
}

/**
 * Fills in isComplete/completionDate for an enrollment that should already
 * have them: every lesson viewed but no completion date, or marked complete
 * (e.g. by rating) without a date. Pages used to do this during render; they
 * now render <CompletionBackfill> for these rare legacy records instead.
 */
export async function recordMissingCompletion(enrollmentId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const [authorizedUser, enrollment] = await Promise.all([
      getAuthorizedUserByEmail(user.email),
      getEnrollByID(enrollmentId, {
        populate: {
          viewedLessons: { fields: ["id"] },
          droplet: {
            fields: ["id"],
            populate: { lessons: { fields: ["id"] } },
          },
          authorizedUser: { fields: ["id"] },
        },
        fields: ["id", "isComplete", "completionDate"],
      }),
    ]);

    if (!enrollment || enrollment.authorizedUser?.id !== authorizedUser?.id) {
      throw new Error("Enrollment not found for this user");
    }

    if (!enrollmentNeedsCompletionBackfill(enrollment)) {
      return { success: true, updated: false };
    }

    await putEnrollment(enrollmentRef(enrollmentId, enrollment), {
      isComplete: true,
      completionDate: enrollment.completionDate ?? new Date(),
    });
    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    return { success: true, updated: true };
  } catch (error) {
    console.error("Error recording missing completion:", error);
    return { success: false, updated: false };
  }
}

// Function to update completion date of enrollment
export async function updateCompletionDate(enrollmentID: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    const authorizedUser = await getAuthorizedUserByEmail(user.email);

    // A missing enrollment throws StrapiEntryNotFoundError, which the catch
    // below turns into the same failure result the old 404 produced.
    const response = await fetch(
      await strapiEntryUrl("enrollments", enrollmentID),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        body: JSON.stringify({
          data: {
            isComplete: true,
            completionDate: new Date(),
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update completion date");
    }

    revalidateTag(CACHE_TAGS.enrollments(authorizedUser.id));
    return { success: true };
  } catch (error) {
    console.error("Error in adding completion date: ", error);
    return { success: false, error: "Failed to add completion date" };
  }
}

export async function createEnrollmentDirect(
  authorizedUserId: number,
  dropletId: number,
) {
  try {
    // Strapi v5 relation writes take documentIds.
    let relations: { authorizedUser: string; droplet: string };
    try {
      relations = {
        authorizedUser: await resolveDocumentId(
          "authorized-users",
          authorizedUserId,
        ),
        droplet: await resolveDocumentId("droplets", dropletId),
      };
    } catch (err) {
      // Same result as Strapi rejecting a relation that does not exist.
      if (err instanceof StrapiEntryNotFoundError) {
        return { ok: false, error: err.message, data: null };
      }
      throw err;
    }

    const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
      method: "POST",
      body: JSON.stringify({
        data: {
          ...relations,
          viewedLessons: [],
        },
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
    });
    const data = await response.json();

    if (!response.ok || (response.ok && data.error)) {
      const errorPath =
        data?.error?.details?.errors?.[0]?.path?.[0] || "Unknown";
      const errorMessage = `${data?.error?.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }

    revalidateTag(CACHE_TAGS.enrollments(authorizedUserId));
    return { ok: true, data: data.data };
  } catch (err) {
    console.error("Error in createEnrollmentDirect:", err);
    return { error: "Database Error: Failed to enroll directly." };
  }
}
