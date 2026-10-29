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

/** A comment on a whole Overview section: its field and nothing else */
export const isWholeSection = (anchor: ReviewAnchor) =>
  !("quote" in anchor) && anchor.blockId === undefined;

/**
 * For the strip under a lesson's title: every comment, and how many are
 * pending (still open and not yet sent to the author).
 */
export function commentCounts(
  comments: readonly ReviewComment[],
  reviewState: Review["state"] | undefined,
): {
  total: number;
  pending: number;
  carried: number;
  carriedRound: number | null;
  addressed: number;
} {
  const unsent = reviewState === undefined || reviewState === "open";
  const open = comments.filter((c) => !isResolved(c));
  // Carried from an earlier round (ODY-807): the round, when it's only one
  const rounds = new Set(open.map(carriedRound).filter((r) => r !== null));
  return {
    total: comments.length,
    pending: unsent ? open.length : 0,
    carried: open.filter((c) => carriedRound(c) !== null).length,
    carriedRound: rounds.size === 1 ? [...rounds][0] : null,
    addressed: open.filter((c) => !!c.addressedAt).length,
  };
}

/**
 * The round a carried comment was first written in, or null for one written
 * in this round (ODY-807)
 */
export const carriedRound = (comment: ReviewComment): number | null =>
  comment.carriedFrom ? comment.carriedFrom.review?.round ?? 0 : null;

/** What a reviewer's tag adds about a carried comment, for a screen reader */
export function carriedNotes(comment: ReviewComment): string[] {
  const round = carriedRound(comment);
  return [
    ...(round !== null
      ? [round > 0 ? `carried from round ${round}` : "carried over"]
      : []),
    ...(comment.addressedAt && !isResolved(comment)
      ? ["marked addressed"]
      : []),
  ];
}

/** "Pending · carried from round 1", for a carried comment's card */
export function carriedMeta(
  comment: ReviewComment,
  pending: boolean,
): string | undefined {
  const round = carriedRound(comment);
  if (round === null || isResolved(comment)) return undefined;
  return `${pending ? "Pending" : "Sent"} · ${round > 0 ? `carried from round ${round}` : "carried over"}`;
}

/** "3 comments on this lesson" */
export const commentCountText = (total: number, place = "this lesson") =>
  `${total} ${total === 1 ? "comment" : "comments"} on ${place}`;

/** "2 pending · sent when you request changes", or null with none pending */
export const pendingText = (pending: number) =>
  pending > 0 ? `${pending} pending · sent when you request changes` : null;

/** The strip's whole text, as a screen reader hears it */
export function commentStripText(
  {
    total,
    pending,
    carried = 0,
    carriedRound = null,
    addressed = 0,
  }: {
    total: number;
    pending: number;
    carried?: number;
    carriedRound?: number | null;
    addressed?: number;
  },
  place = "this lesson",
): string {
  return [
    commentCountText(total, place),
    pendingText(pending),
    carriedText(carried, carriedRound),
    addressedText(addressed),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "3 carried over from round 1", or null with none carried (ODY-807) */
export const carriedText = (carried: number, round: number | null) =>
  carried > 0
    ? `${carried} carried over from ${round ? `round ${round}` : "earlier rounds"}`
    : null;

/** "2 marked addressed by the creator", or null with none (ODY-807) */
export const addressedText = (addressed: number) =>
  addressed > 0 ? `${addressed} marked addressed by the creator` : null;

/** The id a comment's mark is drawn with (data-anchor-id) */
export const markIdFor = (comment: ReviewComment) => `comment-${comment.id}`;

/** Whether a mark id is one of these (outdated) comments */
export const isOutdatedMark = (markId: string, ids: ReadonlySet<number>) =>
  markId.startsWith("comment-") && ids.has(Number(markId.slice(8)));

/**
 * Finds each comment's text in the current content. Drawn ones are styled
 * pending (a dashed amber line) until the review is sent, then tinted over a
 * solid line; a resolved one gets a dotted grey line. A whole block has no
 * mark of its own (the comment layer outlines it), and a spot comment is a
 * caret beside its letters. A comment whose text was edited away is
 * outdated, listed rather than dropped. A whole Overview section has no text
 * to find (its heading takes the tag), so it's left out.
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
    if (isWholeSection(comment.anchor)) continue;
    const range = resolveAnchor(content, comment.anchor);
    if (range === OUTDATED) {
      if (!isResolved(comment)) outdated.push(comment);
      continue;
    }
    const { anchor } = comment;
    const kind = !("quote" in anchor)
      ? "review-mark--block"
      : isResolved(comment)
        ? "review-mark--resolved"
        : sent
          ? "review-mark--sent"
          : "review-mark--pending";
    const point = "quote" in anchor ? anchor.point : undefined;
    drawn.push({
      id: markIdFor(comment),
      range,
      className: `review-mark ${kind}${point ? " review-mark--point" : ""}`,
      ...(point && { point }),
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
  // An Overview section, named by its heading
  section: "Section",
};

/** What a BlockNote block type is called in a tag, e.g. "Paragraph" */
export const blockLabel = (type: string | undefined) =>
  (type && BLOCK_LABELS[type]) ?? "Block";

const trunc = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;

/** The block a whole-block comment is on, as the tag names it */
export type TagBlock = { type?: string; text: string };

/** The words either side of a spot comment, shortened at word boundaries */
export function pointSides(
  anchor: Pick<ReviewAnchorText, "prefix" | "quote" | "suffix" | "point">,
  length = 24,
): { left: string; right: string } {
  const after = anchor.point === "after";
  const left = after ? anchor.prefix + anchor.quote : anchor.prefix;
  const right = after ? anchor.suffix : anchor.quote + anchor.suffix;
  return {
    left:
      left.length > length
        ? `…${left.slice(-length).replace(/^\S*\s/, "")}`
        : left.trimStart(),
    right:
      right.length > length
        ? `${right.slice(0, length).replace(/\s\S*$/, "")}…`
        : right.trimEnd(),
  };
}

type ReviewAnchorText = Extract<ReviewAnchor, { quote: string }>;

/**
 * A few words of what a comment is about (D8): the quoted phrase, the words
 * around a spot with ‸ at the spot, or the block's kind and its first words
 * (for an Overview section, "Section" and its heading).
 * A selection across blocks adds how many it spans. `long` is for labels
 * read in full.
 */
export function commentSnippet(
  comment: ReviewComment,
  block: TagBlock | undefined,
  { long = false, blocks }: { long?: boolean; blocks?: number } = {},
): string {
  const { anchor } = comment;
  if ("quote" in anchor) {
    if (anchor.point) {
      const { left, right } = pointSides(anchor, long ? 30 : 10);
      return `“${left}‸${right}”`;
    }
    const quote = `“${trunc(anchor.quote.replace(/\s*\n\s*/g, " "), long ? 90 : 28)}”`;
    return blocks && blocks > 1 ? `${quote} · ${blocks} blocks` : quote;
  }
  const label = blockLabel(block?.type);
  const words = block?.text.trim();
  return words ? `${label} · “${trunc(words, long ? 70 : 20)}”` : label;
}

/** How many blocks an anchor across blocks spans in the current content */
export function blocksSpanned(
  content: AnchorContent,
  anchor: ReviewAnchor,
): number {
  if (!("endBlockId" in anchor) || anchor.endBlockId === undefined) return 1;
  const blocks = content[anchor.field] ?? [];
  const range = resolveAnchor(content, anchor);
  if (range === OUTDATED || range.endBlockId === undefined) return 1;
  const from = blocks.findIndex((b) => b.id === range.blockId);
  const to = blocks.findIndex((b) => b.id === range.endBlockId);
  return from === -1 || to < from ? 1 : to - from + 1;
}

/** When a comment was written: "Today, 2:49 PM", or "Oct 20, 2:49 PM" */
export function commentTime(
  iso: string | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const day = (d: Date) => d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day(at) === day(now)) return `Today, ${time}`;
  if (day(at) === day(yesterday)) return `Yesterday, ${time}`;
  const date = at.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(at.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
  return `${date}, ${time}`;
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

/** The text a draft comment is for, and its spot if it's at one */
export type DraftMark = { range: AnchorRange; point?: "before" | "after" };

/**
 * The marks as drawn: the lit one (its tag or text is hovered) gets
 * `review-mark--lit`, and the text a comment is being written for is added.
 * The one the panel pointed at gets `review-mark--focus` (ODY-849).
 * A draft for a whole block is outlined by the comment layer instead.
 */
export function decorateMarks(
  drawn: readonly DrawnAnchor[],
  litMarkId: string | null,
  draft: DraftMark | null,
  focusedId?: string | null,
): DrawnAnchor[] {
  const marks = drawn.map((mark) => {
    const lit = mark.id === litMarkId ? " review-mark--lit" : "";
    const focus = mark.id === focusedId ? " review-mark--focus" : "";
    return lit || focus
      ? { ...mark, className: `${mark.className}${lit}${focus}` }
      : mark;
  });
  if (draft) {
    marks.push({
      id: DRAFT_MARK_ID,
      range: draft.range,
      className: `review-mark review-mark--draft${draft.point ? " review-mark--point" : ""}`,
      ...(draft.point && { point: draft.point }),
    });
  }
  return marks;
}

/** The text a draft comment is for, found in the current content */
export function draftMarkIn(
  content: AnchorContent,
  anchor: ReviewAnchor | null,
): DraftMark | null {
  if (!anchor || !("quote" in anchor)) return null;
  const range = resolveAnchor(content, anchor);
  if (range === OUTDATED) return null;
  return anchor.point ? { range, point: anchor.point } : { range };
}

/** Who sent feedback, by name, or "the reviewer" (ODY-807) */
export function reviewerName(review: Pick<Review, "reviewer"> | null): string {
  const name = [review?.reviewer?.firstName, review?.reviewer?.lastName]
    .filter(Boolean)
    .join(" ");
  return name || "the reviewer";
}

/** "Round 1 · sent Oct 28, 3:04 PM", for feedback an author reads (ODY-807) */
export function feedbackMeta(
  review: Pick<Review, "round" | "sentAt">,
  now?: Date,
): string {
  const sent = commentTime(review.sentAt ?? undefined, now);
  return `Round ${review.round}${sent ? ` · sent ${sent.replace(/^(Today|Yesterday)/, (d) => d.toLowerCase())}` : ""}`;
}
