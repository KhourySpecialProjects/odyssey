import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";

/**
 * Client-safe review rules shared by the sidebar and the server checks.
 * Imports only `@/lib/globals` so it can be used anywhere.
 */

export const REVIEW_FROZEN_ERROR = "in_review" as const;

export const REVIEW_FROZEN_MESSAGE =
  "In review. Editing is paused until the reviewer sends it back.";

export type LessonReviewState = { inReview: boolean; isReviewer: boolean };

const has = (roles: readonly string[] | undefined, role: Role) =>
  !!roles?.includes(role);

/**
 * Whether the caller reviews (or may publish) the droplet.
 *
 * In review: a non-author with System Admin, Faculty or Content Editor.
 * No author reviews their own droplet, whatever their role.
 * Not in review: System Admin or Faculty (today's direct publish).
 */
export function isReviewerFor(
  roles?: readonly string[],
  inReview?: boolean | null,
  isAuthor?: boolean,
): boolean {
  if (inReview) {
    return (
      !isAuthor &&
      (has(roles, Role.SysAdmin) ||
        has(roles, Role.Faculty) ||
        has(roles, Role.ContentEditor))
    );
  }
  return has(roles, Role.SysAdmin) || has(roles, Role.Faculty);
}

/** A droplet is frozen for the caller while in review unless they review it. */
export function isFrozenFor(
  roles?: readonly string[],
  inReview?: boolean | null,
  isAuthor?: boolean,
): boolean {
  return !!inReview && !isReviewerFor(roles, true, isAuthor);
}
