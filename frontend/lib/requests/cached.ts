import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getDropletBySlug } from "./droplet";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { getLessonBySlug } from "./lesson";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";
import { getUserGroups, getUserDueDates } from "./groups";
import { USER_POPULATES } from "./user-populates";
import { CACHE_TAGS } from "../cache-tags";

export const getCachedUser = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.profile, CACHE_TAGS.users),
);

export const getCachedUserSocial = cache(async (email: string) => {
  const user = await getCachedUser(email);
  return getAuthorizedUserByEmail(
    email,
    USER_POPULATES.social,
    CACHE_TAGS.userSocial(user.id),
  );
});

export const getCachedUserCreation = cache((email: string) =>
  getAuthorizedUserByEmail(
    email,
    USER_POPULATES.creation,
    CACHE_TAGS.userContent,
  ),
);

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

export const getCachedUserDashboardFull = cache((email: string) =>
  getAuthorizedUserByEmail(
    email,
    USER_POPULATES.dashboardFull,
    CACHE_TAGS.userDashboard,
  ),
);

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
      authorized_users: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: "*" },
      postrequisites: { populate: "*" },
      nextSteps: { fields: ["label", "url"] },
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
          "isHidden",
          "status",
        ],
      },
      nextSteps: { fields: ["id", "label", "url"] },
    },
  }),
);
