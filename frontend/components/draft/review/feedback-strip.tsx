"use client";

import type { ReactNode } from "react";
import { IconMessage } from "@tabler/icons-react";
import type { Review } from "@/types";
import { feedbackMeta, reviewerName } from "@/lib/review-comments";

interface FeedbackStripProps {
  review: Pick<Review, "round" | "sentAt" | "reviewer">;
  /** Comments here, and how many the creator has marked addressed */
  total: number;
  addressed: number;
  /** "this lesson" or "the Overview" */
  place?: string;
  /** The draft is back in review: the feedback can't change */
  inReview?: boolean;
  /** Outdated comments, listed under it */
  children?: ReactNode;
}

/**
 * The strip under the title for a droplet's author once feedback is sent
 * (ODY-807), in the reviewer's strip's colours: who sent it and when, how
 * many comments are on this lesson, and how to read them.
 */
export function FeedbackStrip({
  review,
  total,
  addressed,
  place = "this lesson",
  inReview = false,
  children,
}: FeedbackStripProps) {
  return (
    <div
      role="region"
      aria-label="Reviewer feedback"
      data-testid="feedback-strip"
      className="mt-1 grid w-full gap-2 rounded-lg border border-[var(--rc-accent-soft-border)] bg-[var(--rc-accent-soft)] px-3 py-2 text-sm text-slate-600 dark:text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--rc-accent-text)]">
          <IconMessage className="h-3.5 w-3.5" aria-hidden />
          {total} {total === 1 ? "comment" : "comments"} from{" "}
          {reviewerName(review)} on {place}
        </span>
        <span>{feedbackMeta(review)}</span>
        {addressed > 0 && (
          <span className="text-slate-800 dark:text-slate-100">
            {addressed} marked addressed
          </span>
        )}
      </div>
      {total > 0 && (
        <p>
          {inReview
            ? "The reviewer is reading your changes. Click a highlight or its number to read a comment."
            : "Click a highlight or its number to read a comment, and mark it addressed once you've changed the text."}
        </p>
      )}
      {children}
    </div>
  );
}
