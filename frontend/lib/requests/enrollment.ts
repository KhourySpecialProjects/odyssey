"use server";

import { Enrollment } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "../utils";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { revalidatePath } from "next/cache";
import { Droplet } from "@/types";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
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
    pagination = { pageSize: 25, page: 1 },
    populate = {
      droplet: {
        populate: {
          lessons: {
            fields: ["id", "name", "slug", "rating"],
          },
        },
      },
      viewedLessons: {
        fields: ["id", "name", "slug"],
      },
    },
    fields = ["id", "rating", "isComplete", "isFirstTime"],
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
    next: { tags: ["enrollments"] },
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

    const authorizedUser = await getAuthorizedUserByEmail(user.email, {
      populate: {
        playlists: {
          fields: ["id"],
        },
      },
    });

    const userID = "" + authorizedUser.id;
    console.log("THis is the enrollmentID", enrollmentID);
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
export async function getDropletAverageRating(
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
      pageSize: 100,
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
    return -1;
  }
}
