import type { Review, ReviewComment } from "@/types";
import { resolveAnchor } from "@/lib/anchors/resolve";
import { OUTDATED, type AnchorContent } from "@/lib/anchors/types";
import type { DrawnAnchor } from "@/lib/anchors/editor";

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

/** The id a comment's mark is drawn with (data-anchor-id) */
export const markIdFor = (comment: ReviewComment) => `comment-${comment.id}`;

/**
 * Finds each open comment's text in the current content. Drawn ones are
 * styled pending (dashed amber underline) until the review is sent, then
 * tinted; a whole block gets a wash instead. A comment whose text was edited
 * away is outdated, listed rather than dropped. Resolved comments aren't drawn.
 */
export function commentMarks(
  comments: readonly ReviewComment[],
  content: AnchorContent,
  reviewState: Review["state"] | undefined,
): { drawn: DrawnAnchor[]; outdated: ReviewComment[] } {
  const sent = reviewState !== undefined && reviewState !== "open";
  const drawn: DrawnAnchor[] = [];
  const outdated: ReviewComment[] = [];
  for (const comment of comments) {
    if (isResolved(comment)) continue;
    const range = resolveAnchor(content, comment.anchor);
    if (range === OUTDATED) {
      outdated.push(comment);
      continue;
    }
    // A whole block gets only the wash, so a comment on words inside it
    // still shows its own underline
    const kind = !("quote" in comment.anchor)
      ? "review-mark--block"
      : sent
        ? "review-mark--sent"
        : "review-mark--pending";
    drawn.push({
      id: markIdFor(comment),
      range,
      className: `review-mark ${kind}`,
    });
  }
  return { drawn, outdated };
}
