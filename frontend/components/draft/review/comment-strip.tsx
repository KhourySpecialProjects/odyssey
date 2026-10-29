"use client";

import type { ReactNode } from "react";
import { IconMessage } from "@tabler/icons-react";
import {
  addressedText,
  carriedText,
  commentCountText,
  pendingText,
} from "@/lib/review-comments";

interface CommentStripProps {
  total: number;
  pending: number;
  /** Carried over from an earlier round, and marked addressed (ODY-807) */
  carried?: number;
  carriedRound?: number | null;
  addressed?: number;
  /** "this lesson" or "the Overview" */
  place?: string;
  isLoading?: boolean;
  loadError?: boolean;
  /** Whether blocks have a bar for whole-block comments (BlockNote only) */
  blockBars?: boolean;
  /** Whether headings take whole-section comments (the Overview) */
  sections?: boolean;
  /** The "Comment with the keyboard" button */
  keyboard?: ReactNode;
  children?: ReactNode;
}

/**
 * The light-teal strip under the title in Comment mode (ODY-806, as the
 * redesign prototype has it): how many comments there are and how many are
 * pending, or how to comment when there are none yet.
 */
export function CommentStrip({
  total,
  pending,
  carried = 0,
  carriedRound = null,
  addressed = 0,
  place = "this lesson",
  isLoading = false,
  loadError = false,
  blockBars = false,
  sections = false,
  keyboard,
  children,
}: CommentStripProps) {
  const waiting = pendingText(pending);
  return (
    <div
      role="region"
      aria-label="Inline comments"
      data-testid="review-comment-strip"
      className="mt-1 grid w-full gap-2 rounded-lg border border-[var(--rc-accent-soft-border)] bg-[var(--rc-accent-soft)] px-3 py-2 text-sm text-slate-600 dark:text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {isLoading ? (
          <span>Loading your comments...</span>
        ) : loadError ? (
          <span>Couldn&apos;t load your comments. Reload to try again.</span>
        ) : total > 0 ? (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--rc-accent-text)]">
              <IconMessage className="h-3.5 w-3.5" aria-hidden />
              {commentCountText(total, place)}
            </span>
            {waiting && (
              <span className="text-slate-800 dark:text-slate-100">
                {waiting}
              </span>
            )}
            {[carriedText(carried, carriedRound), addressedText(addressed)]
              .filter(Boolean)
              .map((text) => (
                <span key={text}>{text}</span>
              ))}
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--rc-accent-text)]">
              <IconMessage className="h-3.5 w-3.5" aria-hidden />
              Comment mode
            </span>
            <span>
              Click anywhere in the text to comment right there, or drag across
              words to comment on them.
              {blockBars && " The bar beside a block takes the whole block."}
              {sections && " Click a heading to comment on its whole section."}
            </span>
          </>
        )}
        {keyboard && <span className="ml-auto">{keyboard}</span>}
      </div>
      {children}
    </div>
  );
}
