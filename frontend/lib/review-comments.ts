import type { Review, ReviewComment } from "@/types";

/**
 * Client-side rules for a reviewer's own comments (ODY-806). Pure, so the
 * lesson and the Overview count and number comments the same way.
 */

/** The comments on one lesson's blocks */
export const commentsOnLesson = (
  comments: readonly ReviewComment[],
  lessonId: number,
) => comments.filter((c) => c.field === "blocks" && c.lesson?.id === lessonId);

export const isResolved = (comment: ReviewComment) => !!comment.resolvedAt;

/**
 * For the strip under a lesson's title: every comment, and how many are
 * pending (still open and not yet sent to the author).
 */
export function commentCounts(
  comments: readonly ReviewComment[],
  reviewState: Review["state"] | undefined,
): { total: number; pending: number } {
  const unsent = reviewState === undefined || reviewState === "open";
  return {
    total: comments.length,
    pending: unsent ? comments.filter((c) => !isResolved(c)).length : 0,
  };
}

/** "3 comments on this lesson · 2 pending" */
export function commentStripText(
  { total, pending }: { total: number; pending: number },
  place = "this lesson",
): string {
  const comments = `${total} ${total === 1 ? "comment" : "comments"} on ${place}`;
  return `${comments} · ${pending} pending`;
}
