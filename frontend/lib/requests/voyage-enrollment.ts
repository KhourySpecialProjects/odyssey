"use server";

import { VoyageEnrollment } from "@/types";
import { fetchAPI } from "@/lib/utils";
import { CACHE_TAGS } from "../cache-tags";

/**
 * Fetches all voyage enrollments for a user, with voyage populated for dashboard display.
 */
export async function getVoyageEnrollmentsByUser(
  authorizedUserId: number,
): Promise<VoyageEnrollment[]> {
  return await fetchAPI<VoyageEnrollment[]>("/voyage-enrollments", {
    urlParams: {
      filters: {
        authorizedUser: { id: { $eq: authorizedUserId } },
      },
      fields: ["id", "enrolledAt", "completionPercentage"],
      populate: {
        voyage: {
          fields: ["id", "name", "slug", "description"],
          populate: {
            voyage_playlists: {
              populate: {
                playlist: {
                  fields: ["id"],
                  populate: { droplets: { fields: ["id"] } },
                },
              },
            },
          },
        },
      },
      pagination: { pageSize: 250, page: 1 },
    },
    next: {
      tags: [
        CACHE_TAGS.voyageEnrollments(authorizedUserId),
        CACHE_TAGS.allVoyageEnrollments,
      ],
      revalidate: 900,
    },
  });
}
