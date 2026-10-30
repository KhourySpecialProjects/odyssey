"use client";

import type { ReviewComment } from "@/types";
import { cn } from "@/lib/utils";
import {
  commentSnippet,
  commentTime,
  isResolved,
  markIdFor,
} from "@/lib/review-comments";
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
  focusedMarkId,
  onOpen,
}: {
  comments: readonly ReviewComment[];
  positions: Record<string, Position>;
  /** Comments to show as outdated whatever their position */
  outdatedIds?: ReadonlySet<number>;
  /** The mark the panel last pointed at, to mark its comment as picked */
  focusedMarkId?: string | null;
  onOpen: (comment: ReviewComment) => void;
}) {
  if (comments.length === 0) return null;
  const sorted = sortByPosition([...comments], (c) => `c${c.id}`, positions);

  return (
    <ul className="space-y-1.5">
      {sorted.map((comment, index) => {
        const position = positions[`c${comment.id}`];
        const outdated =
          outdatedIds?.has(comment.id) ||
          (position !== undefined && "outdated" in position);
        const resolved = isResolved(comment);
        const selected = focusedMarkId === markIdFor(comment);
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
              aria-current={selected || undefined}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border border-transparent p-1.5 text-left text-xs",
                selected ? "border-[#2D7597]" : "hover:border-[#D0D5DD]",
                resolved && "opacity-60",
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-[#344054]"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block border-l-2 border-amber-400 bg-amber-50 py-1 pr-1 pl-2 text-slate-700">
                  {"quote" in anchor && anchor.point ? (
                    <SpotQuote anchor={anchor} length={10} />
                  ) : (
                    commentSnippet(comment, undefined)
                  )}
                </span>
                <span className="mt-1.5 block text-sm leading-snug text-slate-900">
                  {comment.body}
                </span>
                {outdated && (
                  <span className="mt-0.5 block text-slate-600">
                    {OUTDATED_TEXT}
                  </span>
                )}
                {(meta || resolved) && (
                  <span className="mt-1 flex gap-1.5 text-[#667085]">
                    {meta && <span>{meta}</span>}
                    {resolved && <span className="font-medium">Resolved</span>}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
