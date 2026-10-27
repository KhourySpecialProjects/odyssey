import type { Review, ReviewAnchor, ReviewComment } from "@/types";
import { resolveAnchor } from "@/lib/anchors/resolve";
import {
  OUTDATED,
  type AnchorContent,
  type AnchorRange,
} from "@/lib/anchors/types";
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
 * tinted; a whole block gets a wash instead. A resolved comment's mark is
 * invisible but keeps its tag in place. A comment whose text was edited away
 * is outdated, listed rather than dropped.
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
    const range = resolveAnchor(content, comment.anchor);
    if (range === OUTDATED) {
      if (!isResolved(comment)) outdated.push(comment);
      continue;
    }
    // A whole block gets only the wash, so a comment on words inside it
    // still shows its own underline
    const kind = isResolved(comment)
      ? "review-mark--resolved"
      : !("quote" in comment.anchor)
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

/**
 * Open comments' numbers (D7): 1, 2, 3 in the order they were written, so a
 * new comment always gets the next one. Resolving takes a comment out and the
 * rest close up; resolved comments have no number. Comments not saved yet
 * (negative ids, -1 first) come after every saved one.
 */
export function numberComments(
  comments: readonly ReviewComment[],
): Map<number, number> {
  const rank = (c: ReviewComment) =>
    c.id > 0 ? c.id : Number.MAX_SAFE_INTEGER / 2 - c.id;
  const open = comments
    .filter((c) => !isResolved(c))
    .sort((a, b) => rank(a) - rank(b));
  return new Map(open.map((c, i) => [c.id, i + 1]));
}

const BLOCK_LABELS: Record<string, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  bulletListItem: "List item",
  numberedListItem: "List item",
  checkListItem: "List item",
  table: "Table",
  callout: "Callout",
  image: "Image",
  latex: "Equation",
  codeBlock: "Code",
  "code-block": "Code",
  "notebook-code": "Code",
  "sandpack-block": "Code",
  "quiz-multiple-choice": "Check-in",
  "quiz-true-false": "Check-in",
  "quiz-open-ended": "Check-in",
};

/** What a BlockNote block type is called in a tag, e.g. "Paragraph" */
export const blockLabel = (type: string | undefined) =>
  (type && BLOCK_LABELS[type]) ?? "Block";

const trunc = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;

/** The block a whole-block comment is on, as the tag names it */
export type TagBlock = { type?: string; text: string };

/**
 * A few words of what a comment is about (D8): the quoted phrase, or the
 * block's kind and its first words. `long` is for labels read in full.
 */
export function commentSnippet(
  comment: ReviewComment,
  block: TagBlock | undefined,
  { long = false }: { long?: boolean } = {},
): string {
  const { anchor } = comment;
  if ("quote" in anchor) return `“${trunc(anchor.quote, long ? 90 : 24)}”`;
  const label = blockLabel(block?.type);
  const words = block?.text.trim();
  return words ? `${label} · “${trunc(words, long ? 70 : 20)}”` : label;
}

type BlockLike = { id?: string; type?: string; children?: BlockLike[] };

/** Each BlockNote block's type by id, children included */
export function blockTypes(blocks: readonly BlockLike[]): Map<string, string> {
  const types = new Map<string, string>();
  const add = (block: BlockLike) => {
    if (block.id && block.type) types.set(block.id, block.type);
    block.children?.forEach(add);
  };
  blocks.forEach(add);
  return types;
}

/** The id of the mark drawn under the text a comment is being written for */
export const DRAFT_MARK_ID = "comment-draft";

/**
 * The marks as drawn: the lit one (its tag or text is hovered) gets
 * `review-mark--lit`, and the text a comment is being written for is added.
 */
export function decorateMarks(
  drawn: readonly DrawnAnchor[],
  litMarkId: string | null,
  draftRange: AnchorRange | null,
): DrawnAnchor[] {
  const marks = drawn.map((mark) =>
    mark.id === litMarkId
      ? { ...mark, className: `${mark.className} review-mark--lit` }
      : mark,
  );
  if (draftRange) {
    marks.push({
      id: DRAFT_MARK_ID,
      range: draftRange,
      className: "review-mark review-mark--draft",
    });
  }
  return marks;
}

/** The text a draft comment is for, found in the current content */
export function draftRangeIn(
  content: AnchorContent,
  anchor: ReviewAnchor | null,
): AnchorRange | null {
  if (!anchor) return null;
  const range = resolveAnchor(content, anchor);
  return range === OUTDATED ? null : range;
}
