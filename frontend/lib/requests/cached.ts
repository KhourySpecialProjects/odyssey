import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getDropletBySlug } from "./droplet";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";
import { getUserGroups, getUserDueDates } from "./groups";
import { USER_POPULATES } from "./user-populates";

export const getCachedUser = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.profile),
);

export const getCachedUserSocial = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.social),
);

export const getCachedUserCreation = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.creation),
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
  getAuthorizedUserByEmail(email, USER_POPULATES.dashboardFull),
);

export const getCachedUserGroups = cache((authorizedUserId: number) =>
  getUserGroups(authorizedUserId),
);

export const getCachedUserDueDates = cache((authorizedUserId: number) =>
  getUserDueDates(authorizedUserId),
);

export const getCachedDropletBySlug = cache((slug: string) =>
  getDropletBySlug(slug, {
    populate: {
      authorized_users: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
      nextSteps: { populate: "*" },
    },
  }),
);
