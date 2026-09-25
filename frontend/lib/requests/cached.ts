import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getDropletBySlug, getDroplets } from "./droplet";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { getLessonBySlug } from "./lesson";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";
import { getUserGroups, getUserDueDates } from "./groups";
import { USER_POPULATES } from "./user-populates";
import { CACHE_TAGS } from "../cache-tags";
import { getCurrentUser } from "../auth/session";
import { SLIDE_BREAK_MARKER } from "../blocknote/slide-break";
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

/**
 * The draft editor's droplet, shared by the draft layout (access check +
 * sidebar), the overview page and the lesson page — one query per request.
 * Fields are explicit: `populate: "*"` on lessons pulled every learner's
 * enrollments, notes and highlights along with each lesson's full content.
 */
export const getCachedDraftDropletBySlug = cache((slug: string) =>
  getDropletBySlug(slug, {
    fields: [
      "name",
      "slug",
      "type",
      "focusArea",
      "difficulty",
      "description",
      "overview",
      "isHidden",
      "status",
      "inReview",
      "afterReview",
      "funFact",
      "originalDropletId",
      "presentationEnabled",
    ],
    populate: {
      // Layout access check and the Authors editor only compare ids.
      authorized_users: { fields: ["id"] },
      learningObjectives: { fields: ["id", "objective"] },
      // Sidebar lesson list. Block data only feeds its slide-break check, so
      // v1 blocks are narrowed to slide-break markers; v2 JSON can't be.
      lessons: {
        fields: [
          "id",
          "name",
          "slug",
          "type",
          "orderIndex",
          "blocksVersion",
          "blocksV2",
        ],
        populate: {
          blocks: {
            on: {
              "droplets.generic": {
                fields: ["content"],
                filters: { content: { $eq: SLIDE_BREAK_MARKER } },
              },
            },
          },
        },
      },
      tags: { fields: ["id", "name", "slug"] },
      prerequisites: { fields: ["id", "name", "slug"] },
      postrequisites: { fields: ["id", "name", "slug"] },
      nextSteps: { fields: ["id", "label", "url"] },
      // Datasets editor and the lesson page's notebook runtime.
      datasets: {
        fields: ["id", "name", "format", "fileUrl", "fileSize"],
        sort: ["createdAt:asc"],
      },
    },
  }),
);

/**
 * Published droplets the draft editor offers as choices: the sidebar's
 * "Add Existing Lesson" picker (uses lessons) and the overview page's
 * prerequisite / similar-droplet pickers (filter out `isHidden`). One query
 * shared by the draft layout and overview page.
 */
export const getCachedDraftDropletOptions = cache(() =>
  getDroplets({
    filters: { status: { $eq: "published" } },
    fields: ["id", "name", "slug", "isHidden"],
    populate: {
      lessons: { fields: ["id", "name", "orderIndex"] },
    },
    pagination: { pageSize: 250, page: 1 },
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
