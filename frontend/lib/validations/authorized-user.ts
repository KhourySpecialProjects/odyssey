import { z } from "zod";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

export const AuthorizedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  isEnabled: z.coerce.boolean(),
});

/**
 * Field names the currently-authenticated user is allowed to edit on their
 * own record.  Admin-only fields (roles, isEnabled) are absent from this list.
 */
export const SELF_EDIT_FIELDS = [
  "first",
  "last",
  "bio",
  "linkedin",
  "github",
  "website",
  "profilePhoto",
  "photo",
  "firstTime",
  "isPublic",
] as const;

const roleEnum = z.nativeEnum(AuthorizedUserRoleTitle);

/**
 * Full update schema — admins only.  All fields optional so partial updates
 * work; at least one field must be present (validated at runtime).
 */
export const UpdateUserInfoSchema = z
  .object({
    first: z.string().nullable().optional(),
    last: z.string().nullable().optional(),
    bio: z.string().max(400).nullable().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    photo: z.string().nullable().optional(),
    firstTime: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    // Admin-only fields
    isEnabled: z.boolean().optional(),
    roles: z.array(roleEnum).optional(),
  })
  .strip();

/**
 * Restricted update schema — non-admin users editing their own record.
 * Only safe profile fields; admin-only fields (roles, isEnabled) are excluded.
 */
export const UpdateUserInfoSelfSchema = z
  .object({
    first: z.string().nullable().optional(),
    last: z.string().nullable().optional(),
    bio: z.string().max(400).nullable().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    photo: z.string().nullable().optional(),
    firstTime: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  })
  .strict(); // reject any extra keys so admin-only fields cannot slip through
