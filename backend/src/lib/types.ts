/**
 * Shared types for populated Strapi relations.
 */

/** Populated authorized-user fields used across lifecycle notifications. */
export interface PopulatedUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}
