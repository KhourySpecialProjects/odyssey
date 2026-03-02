import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { ENROLLMENT_POPULATES } from "./enrollment-populates";
import { USER_POPULATES } from "./user-populates";

export const getCachedUser = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.profile),
);

export const getCachedUserSocial = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.social),
);

export const getCachedUserDashboard = cache((email: string) =>
  getAuthorizedUserByEmail(email, USER_POPULATES.dashboard),
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
