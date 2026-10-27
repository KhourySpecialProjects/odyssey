"use client";

import { IconLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How a reviewer sees a lesson in review (ODY-806) */
export type ReviewMode = "read" | "comment" | "edit";

interface ReviewModeBarProps {
  mode: ReviewMode;
  onModeChange: (mode: "read" | "comment") => void;
  onEdit: () => void;
  onStopEditing: () => void;
  /** While a lock takeover is loading the latest version */
  editDisabled?: boolean;
  /** What's being reviewed, as the bar names it */
  subject?: "lesson" | "overview";
}

const MODES = [
  { mode: "comment", label: "Comment" },
  { mode: "read", label: "Read" },
] as const;

/**
 * The reviewer's bar on a lesson in review: Comment or Read without the lock,
 * or Edit, which takes the lock (ODY-810) and hides the comment layer.
 */
export function ReviewModeBar({
  mode,
  onModeChange,
  onEdit,
  onStopEditing,
  editDisabled = false,
  subject = "lesson",
}: ReviewModeBarProps) {
  const name = subject === "lesson" ? "this lesson" : "the Overview";
  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <IconLock className="h-4 w-4 shrink-0" aria-hidden />
      {mode === "edit" ? (
        <>
          <span className="flex-1">
            You&apos;re editing {name} during its review.
          </span>
          <Button size="sm" variant="outline" onClick={onStopEditing}>
            Stop editing
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1">
            In review. {name === "this lesson" ? "This lesson" : "The Overview"}{" "}
            is read-only while you review it.
          </span>
          <div
            role="group"
            aria-label="Review mode"
            className="inline-flex rounded-md border border-amber-300 bg-white p-0.5 dark:border-amber-700 dark:bg-slate-900"
          >
            {MODES.map((option) => (
              <button
                key={option.mode}
                type="button"
                aria-pressed={mode === option.mode}
                onClick={() => onModeChange(option.mode)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none",
                  mode === option.mode
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={editDisabled}
            onClick={onEdit}
          >
            Edit
          </Button>
        </>
      )}
    </div>
  );
}
