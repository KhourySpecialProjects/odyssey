import { cache } from "react";
import { getAuthorizedUserByEmail } from "./authorized-user";
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
