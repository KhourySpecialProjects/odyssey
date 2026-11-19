import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { LearnerEnrollment } from "@/lib/mentor/learner";
import { fetchAPI } from "@/lib/utils";

/**
 * A student's enrollments as plain rows, for Mentor's learner block (ODY-934)
 * and Recommendations. Never rating, notes, due dates, groups or voyages.
 * Server-only, never "use server": the id must come from the session.
 */
export async function getLearnerEnrollments(
  userId: number,
): Promise<LearnerEnrollment[]> {
  const rows = await fetchAPI<LearnerEnrollment[] | null>("/enrollments", {
    urlParams: {
      filters: {
        authorizedUser: { id: { $eq: userId } },
        droplet: { id: { $notNull: true } },
      },
      fields: [
        "isComplete",
        "isArchived",
        "completionDate",
        "lastProgressDate",
        "updatedAt",
      ],
      populate: {
        droplet: {
          fields: ["name", "difficulty", "status", "isHidden"],
          populate: {
            tags: { fields: ["name"] },
            lessons: { fields: ["id"] },
          },
        },
        viewedLessons: { fields: ["name"] },
      },
      sort: ["updatedAt:desc"],
      pagination: { pageSize: 250, page: 1 },
    },
    next: {
      tags: [
        CACHE_TAGS.enrollments(userId),
        CACHE_TAGS.allEnrollments,
        CACHE_TAGS.droplets,
      ],
      revalidate: 900,
    },
  });
  return rows ?? [];
}
