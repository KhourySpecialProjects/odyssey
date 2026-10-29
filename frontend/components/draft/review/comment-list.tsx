"use client";

import type { ReviewComment } from "@/types";
import { cn } from "@/lib/utils";
import { commentSnippet, commentTime, isResolved } from "@/lib/review-comments";
import { sortByPosition, type Position } from "@/lib/review-panel/positions";
import { SpotQuote } from "./comment-about";

/** What the panel shows for a comment whose text has changed (as ODY-806 does) */
export const OUTDATED_TEXT = "Outdated: the text it pointed at has changed";

/**
 * A card's comments in reading order (ODY-805). Comments with no position
 * come last. Clicking one opens its page.
 */
export function CommentList({
  comments,
  positions,
  outdatedIds,
  onOpen,
}: {
  comments: readonly ReviewComment[];
  positions: Record<string, Position>;
  /** Comments to show as outdated whatever their position */
  outdatedIds?: ReadonlySet<number>;
  onOpen: (comment: ReviewComment) => void;
}) {
  if (comments.length === 0) return null;
  const sorted = sortByPosition([...comments], (c) => `c${c.id}`, positions);

  return (
    <ul className="mt-2 space-y-1.5">
      {sorted.map((comment) => {
        const position = positions[`c${comment.id}`];
        const outdated =
          outdatedIds?.has(comment.id) ||
          (position !== undefined && "outdated" in position);
        const resolved = isResolved(comment);
        const { anchor } = comment;
        const author = comment.author
          ? [comment.author.firstName, comment.author.lastName]
              .filter(Boolean)
              .join(" ")
          : "";
        const meta = [author, commentTime(comment.createdAt)]
          .filter(Boolean)
          .join(" · ");

        return (
          <li key={comment.id}>
            <button
              type="button"
              onClick={() => onOpen(comment)}
              className={cn(
                "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50",
                resolved && "opacity-60",
              )}
            >
              <span className="block text-slate-500 italic">
                {"quote" in anchor && anchor.point ? (
                  <SpotQuote anchor={anchor} length={10} />
                ) : (
                  commentSnippet(comment, undefined)
                )}
              </span>
              <span className="mt-0.5 block text-slate-800">
                {comment.body}
              </span>
              {outdated && (
                <span className="mt-0.5 block text-slate-600">
                  {OUTDATED_TEXT}
                </span>
              )}
              {(meta || resolved) && (
                <span className="mt-0.5 flex gap-1.5 text-slate-500">
                  {meta && <span>{meta}</span>}
                  {resolved && <span className="font-medium">Resolved</span>}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
