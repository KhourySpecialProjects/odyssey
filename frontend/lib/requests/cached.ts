import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getDropletBySlug } from "./droplet";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { getLessonBySlug } from "./lesson";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";
import { getUserGroups, getUserDueDates } from "./groups";
import { USER_POPULATES } from "./user-populates";
import { CACHE_TAGS } from "../cache-tags";
import { getCurrentUser } from "../auth/session";
import {
  getVoyageEnrollment,
  getVoyageEnrollmentsByUser,
} from "./voyage-enrollment";

export const getCachedUser = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.profile, CACHE_TAGS.users),
);

/**
 * Resolves the authorized-user id needed for per-user cache tags. For the
 * signed-in user it comes from the session token, so the tagged read can start
 * without waiting on a lookup; otherwise (or for tokens issued before the id
 * was stored) it falls back to the request-deduplicated lookup by email.
 */
async function getUserIdForEmail(email: string): Promise<number | undefined> {
  const sessionUser = await getCurrentUser();
  if (sessionUser?.id && sessionUser.email === email) return sessionUser.id;
  return (await getCachedUser(email))?.id;
}

export const getCachedUserSocial = cache(async (email: string) => {
  const userId = await getUserIdForEmail(email);
  if (!userId) return undefined;
  return getAuthorizedUserByEmail(
    email,
    USER_POPULATES.social,
    CACHE_TAGS.userSocial(userId),
  );
});

// Two-level tags: per-user actions revalidate userContent(id); mutations that
// touch many users' /my-content (shared droplets/playlists) sweep allUserContent.
export const getCachedUserCreation = cache(async (email: string) => {
  const userId = await getUserIdForEmail(email);
  return getAuthorizedUserByEmail(email, USER_POPULATES.creation, [
    ...(userId ? [CACHE_TAGS.userContent(userId)] : []),
    CACHE_TAGS.allUserContent,
  ]);
});

export const getCachedEnrollments = cache((authorizedUserId: number) =>
  getEnrollmentsByAuthorizedUser(authorizedUserId),
);

export const getCachedEnrollmentsWithLessonIds = cache(
  (authorizedUserId: number) =>
    getEnrollmentsByAuthorizedUser(authorizedUserId, {
      populate: ENROLLMENT_POPULATES.withLessonIds,
    }),
);

export const getCachedEnrollmentsDashboard = cache((authorizedUserId: number) =>
  getEnrollmentsByAuthorizedUser(authorizedUserId, {
    populate: ENROLLMENT_POPULATES.dashboard,
  }),
);

export const getCachedEnrollmentsFavorites = cache((authorizedUserId: number) =>
  getEnrollmentsByAuthorizedUser(authorizedUserId, {
    populate: ENROLLMENT_POPULATES.favorites,
  }),
);

// Two-level tags: per-user actions revalidate userDashboard(id); mutations that
// touch many users' dashboards (playlist/group/droplet edits) sweep allUserDashboards.
export const getCachedUserDashboardFull = cache(async (email: string) => {
  const userId = await getUserIdForEmail(email);
  return getAuthorizedUserByEmail(email, USER_POPULATES.dashboardFull, [
    ...(userId ? [CACHE_TAGS.userDashboard(userId)] : []),
    CACHE_TAGS.allUserDashboards,
  ]);
});

export const getCachedUserGroups = cache((authorizedUserId: number) =>
  getUserGroups(authorizedUserId),
);

export const getCachedUserDueDates = cache((authorizedUserId: number) =>
  getUserDueDates(authorizedUserId),
);

export const getCachedLessonBySlug = cache((slug: string) =>
  getLessonBySlug(slug),
);

export const getCachedDraftDropletBySlug = cache((slug: string) =>
  getDropletBySlug(slug, {
    fields: ["*"],
    populate: {
      authorized_users: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: "*" },
      postrequisites: { populate: "*" },
      nextSteps: { fields: ["label", "url"] },
      datasets: { fields: ["name", "url", "fileType", "fileSize"] },
    },
  }),
);

export const getCachedDropletBySlug = cache((slug: string) =>
  getDropletBySlug(slug, {
    populate: {
      authorized_users: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      learningObjectives: { fields: ["id", "objective"] },
      lessons: {
        fields: ["id", "name", "slug", "orderIndex", "blocksVersion"],
      },
      tags: { fields: ["id", "name", "slug"] },
      prerequisites: {
        fields: [
          "id",
          "name",
          "slug",
          "type",
          "focusArea",
          "difficulty",
          "isHidden",
          "status",
        ],
      },
      postrequisites: {
        fields: [
          "id",
          "name",
          "slug",
          "type",
          "focusArea",
          "difficulty",
          "isHidden",
          "status",
        ],
      },
      nextSteps: { fields: ["id", "label", "url"] },
      datasets: {
        fields: ["id", "name", "url", "fileType", "fileSize"],
      },
    },
  }),
);

export const getCachedVoyageEnrollment = cache(
  async (authorizedUserId: number, voyageId: number) =>
    getVoyageEnrollment(authorizedUserId, voyageId),
);

export const getCachedVoyageEnrollmentsByUser = cache(
  async (authorizedUserId: number) =>
    getVoyageEnrollmentsByUser(authorizedUserId),
);
