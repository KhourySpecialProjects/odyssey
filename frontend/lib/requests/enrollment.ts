"use server";

import { Enrollment, Lesson } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidatePath, revalidateTag } from "next/cache";
import { Droplet } from "@/types";
import { DropletEnrollmentSchema } from "../validations/enrollment";
import { z } from "zod";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

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
    populate = {
      droplet: {
        populate: {
          lessons: {
            fields: ["id", "name", "slug"],
          },
          tags: {
            fields: ["*"],
          },
        },
        fields: ["id", "*"],
      },
      viewedLessons: {
        fields: ["id", "name", "slug"],
      },
    },
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
      $and: [filters, { authorizedUser: { id: { $eq: authorizedUserId } } }],
    },
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Enrollment[]>(path, {
    urlParams,
    next: { tags: ["enrollments"], revalidate: 0 },
    cache: "no-store",
  });
}

/**
 * Determines if the given authorized user is enrolled in the given Droplet.
 * @param authorizedUserId The unique ID of the authorized user.
 * @param dropletId The unique ID of the Droplet.
 * @param options Strapi query modifiers.
 * @returns `true` if the authorized user is already enrolled in the Droplet, else `false`.
 */
export async function getIsEnrolled(
  authorizedUserId: number,
  dropletId: number,
  { sort, filters, populate = "*", fields = ["*"] }: StrapiRequestParams = {},
): Promise<boolean> {
  const path = `/enrollments`;
  const urlParams = {
    sort,
    filters: {
      $and: {
        ...filters,
        authorizedUser: { id: { $eq: authorizedUserId } },
        droplet: { id: { $eq: dropletId } },
      },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<Enrollment[]>(path, { urlParams }).then(
    (enrollments) => enrollments.length > 0,
  );
}

/**
 * Determines if the given authorized user is enrolled in the given Droplet.
 * @param authorizedUserId The unique ID of the authorized user.
 * @param dropletId The unique ID of the Droplet.
 * @param options Strapi query modifiers.
 * @returns `true` if the authorized user is already enrolled in the Droplet, else `false`.
 */

export async function getIsEnrollComplete(
  authorizedUserId: number,
  dropletId: number,
): Promise<boolean> {
  const path = `/enrollments`;
  const urlParams = {
    filters: {
      $and: [
        { authorizedUser: { id: { $eq: authorizedUserId } } },
        { droplet: { id: { $eq: dropletId } } },
      ],
    },
    fields: ["isComplete"],
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };
  try {
    const enrollments = await fetchAPI<Enrollment[]>(path, { urlParams });
    return enrollments[0]?.isComplete ?? false;
  } catch (error) {
    console.error("Error fetching enrollment status: ", error);
    return false;
  }
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

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/enrollments/${enrollmentID}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            rating: newRating,
            isComplete: true,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update enrollment");
    }

    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dashboard", "page");

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
  const urlParams = {
    filters: {
      droplet: { id: { $eq: droplet.id } },
      rating: { $notNull: true },
    },
    fields: ["rating"],
    pagination: {
      pageSize: 1000,
      page: 1,
    },
  };

  try {
    const enrollments = await fetchAPI<Enrollment[]>(path, {
      urlParams,
    });

    if (!enrollments || enrollments.length < 5) {
      return 0;
    }

    const totalRating = enrollments.reduce((sum, enrollment) => {
      return sum + (enrollment.rating || 0);
    }, 0);

    return totalRating / enrollments.length;
  } catch (error) {
    console.error("Error calculating droplet average rating:", error);
    return Promise.reject(new Error("Error getting droplet average rating"));
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
      next: { tags: ["enrollments"], revalidate: 0 },
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/enrollments/${enrollmentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            isFirstTime: false,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update enrollment");
    }

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
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    if (
      !enrollments
        .map((enrollment) => enrollment.droplet.id)
        .includes(formData.droplet)
    ) {
      const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          data: { ...formData, authorizedUser: authorizedUser.id },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      });
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }
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
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    const toRemove = enrollments.filter(
      (e) => e.droplet.id === formData.droplet,
    );

    if (toRemove.length > 0) {
      const response = await fetch(
        STRAPI_API_URL + "/api/enrollments/" + toRemove[0].id,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          },
        },
      );
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }

      revalidateTag("enrollments");
      revalidatePath("/(droplets)/d/[slug]", "page");
      revalidatePath("/(general)/dashboard", "page");
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
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    if (
      !enrollments
        .map((enrollment) => enrollment.droplet.id)
        .includes(droplet.id)
    ) {
      const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorizedUser: authorizedUser.id,
            droplet: droplet.id,
            viewedLessons: viewedLessons,
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      });
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }
      revalidateTag("enrollments");
      revalidatePath("/(droplets)/d/[slug]", "page");
      revalidatePath("/(droplets)/d/[slug]/[lessonSlug]", "page");
      revalidatePath("/(general)/dashboard", "page");
      revalidatePath(`/(droplets)/d/${droplet.slug}`, "page");
      if (droplet.lessons) {
        revalidatePath(
          `/(droplets)/d/${droplet.slug}/${droplet.lessons[0].slug}`,
          "page",
        );
      }
      return { ok: true, error: null, data: data.data };
    }
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to enroll." };
  }
}
