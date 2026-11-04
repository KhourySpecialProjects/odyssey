"use client";

import type { ReactNode } from "react";
import { IconMessage, IconPencil } from "@tabler/icons-react";
import type { Review } from "@/types";
import { cn } from "@/lib/utils";
import { feedbackMeta, reviewerName } from "@/lib/review-comments";

interface FeedbackStripProps {
  review: Pick<Review, "round" | "sentAt" | "reviewer" | "summaryNote">;
  /** Comments here, and how many the creator has marked addressed */
  total: number;
  addressed: number;
  /** "this lesson" or "the Overview" */
  place?: string;
  /** The draft is back in review: the feedback can't change */
  inReview?: boolean;
  /** Controls at the strip's end, such as the Overview's Feedback / Edit */
  actions?: ReactNode;
  /** How to read the comments: not while the editors are showing */
  showHint?: boolean;
  /** The Overview: the reviewer's summary note, and the lessons' comments */
  summary?: boolean;
  lessonComments?: { total: number; lessons: number };
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
  actions,
  showHint = true,
  summary = false,
  lessonComments,
  children,
}: FeedbackStripProps) {
  const note = summary ? review.summaryNote?.trim() : null;
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
          {total > 0
            ? `${total} ${total === 1 ? "comment" : "comments"} from ${reviewerName(review)} on ${place}`
            : `Feedback from ${reviewerName(review)}`}
        </span>
        <span>{feedbackMeta(review)}</span>
        {addressed > 0 && (
          <span className="text-slate-800 dark:text-slate-100">
            {addressed} marked addressed
          </span>
        )}
        {lessonComments && lessonComments.total > 0 && (
          <span>
            {lessonComments.total}{" "}
            {lessonComments.total === 1 ? "comment" : "comments"} on{" "}
            {lessonComments.lessons}{" "}
            {lessonComments.lessons === 1 ? "lesson" : "lessons"}
          </span>
        )}
        {actions && <span className="ml-auto">{actions}</span>}
      </div>
      {note && (
        <blockquote className="border-l-2 border-[var(--rc-accent)] pl-3 whitespace-pre-wrap text-slate-800 dark:text-slate-100">
          {note}
        </blockquote>
      )}
      {total > 0 && showHint && (
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

export type FeedbackView = "feedback" | "edit";

/**
 * Feedback / Edit, in the strip's actions, where the comments can't be marked
 * in the editors (ODY-807's Overview, ODY-880's Classic lessons): Feedback
 * shows the text as the reviewer saw it, and Edit the editors.
 */
export function FeedbackViewToggle({
  label,
  view,
  onChange,
}: {
  /** "Overview view" or "Lesson view" */
  label: string;
  view: FeedbackView;
  onChange: (view: FeedbackView) => void;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg bg-white/70 p-0.5 dark:bg-[#26324a]"
    >
      {(
        [
          { value: "feedback", label: "Feedback", Icon: IconMessage },
          { value: "edit", label: "Edit", Icon: IconPencil },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => {
            if (value !== view) onChange(value);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none",
            view === value
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] dark:bg-[#131c2e] dark:text-slate-50"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
          )}
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              view === value && "text-[var(--rc-accent-text)]",
            )}
            aria-hidden
          />
          {label}
        </button>
      ))}
    </span>
  );
}
