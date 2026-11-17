"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconArrowNarrowRight,
  IconEyeOff,
  IconMessagePlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CommentComposer } from "./comment-composer";
import { BAND_COLORS, type Band } from "@/lib/review-panel/colors";
import type { AiFinding } from "@/types";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7597] focus-visible:ring-offset-1";

type Props = {
  finding: AiFinding;
  number: number;
  band: Band;
  /** The lesson tag on an Overall finding, e.g. "Lesson 3" */
  lessonLabel?: string | null;
  /** The panel last pointed at this one in the lesson */
  selected?: boolean;
  onShowInLesson?: (finding: AiFinding) => void;
  /** Posts a comment on the finding; resolves to an error message or null. Shown only when given */
  onAddComment?: (finding: AiFinding, body: string) => Promise<string | null>;
  /** The composer was opened */
  onStartComment?: (finding: AiFinding) => void;
  onDismiss: (findingId: string) => void;
};

/** One numbered transgression: quote, reason, Show in lesson, Add as comment and Not an issue */
export function FindingItem({
  finding,
  number,
  band,
  lessonLabel,
  selected,
  onShowInLesson,
  onAddComment,
  onStartComment,
  onDismiss,
}: Props) {
  const { text: colour, tint, line } = BAND_COLORS[band];
  const [composing, setComposing] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const wasComposing = useRef(false);
  // Closing the composer returns focus to the button that opened it
  useEffect(() => {
    if (wasComposing.current && !composing) addRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  return (
    <li
      aria-current={selected || undefined}
      className={cn(
        "rounded-lg border border-transparent p-1",
        selected && "border-[#2D7597]",
      )}
    >
      <div className="flex items-start gap-2 p-1.5">
        <span
          className="mt-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
          style={{ background: colour }}
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          {lessonLabel && (
            <span className="mb-1 inline-block rounded bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-[#344054]">
              {lessonLabel}
            </span>
          )}
          <blockquote
            className="block rounded-sm py-1 pr-1 pl-2 text-xs text-slate-700"
            style={{
              background: tint,
              borderLeft: `2px solid ${line}`,
            }}
          >
            <span className="sr-only">Highlighted text: </span>“{finding.quote}”
          </blockquote>
          <p className="mt-1.5 text-sm leading-snug text-slate-900">
            {finding.reason}
          </p>
          {onShowInLesson && (
            <button
              type="button"
              onClick={() => onShowInLesson(finding)}
              className={cn(
                "mt-1 inline-flex items-center gap-0.5 rounded text-xs text-[#667085] hover:text-[#1F5E7A] hover:underline",
                FOCUS,
              )}
            >
              Show in lesson
              <IconArrowNarrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pb-1 pl-9 text-xs">
        {onAddComment && !composing && (
          <button
            ref={addRef}
            type="button"
            onClick={() => {
              setComposing(true);
              onStartComment?.(finding);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded text-[#1F5E7A] hover:underline",
              FOCUS,
            )}
          >
            <IconMessagePlus size={14} aria-hidden="true" />
            Add as comment
          </button>
        )}
        <button
          type="button"
          aria-disabled={composing || undefined}
          onClick={() => !composing && onDismiss(finding.id)}
          className={cn(
            "inline-flex items-center gap-1 rounded text-[#667085] hover:text-[#344054] hover:underline",
            composing && "cursor-not-allowed opacity-60",
            FOCUS,
          )}
        >
          <IconEyeOff size={14} aria-hidden="true" />
          Not an issue
        </button>
      </div>
      {onAddComment && composing && (
        <div className="pr-1 pb-1 pl-9">
          <CommentComposer
            inline
            label={`Comment on finding ${number}`}
            initialBody={finding.reason}
            onCancel={() => setComposing(false)}
            onPost={async (body) => {
              const failure = await onAddComment(finding, body);
              if (!failure) {
                toast.success("Comment saved");
                setComposing(false);
              }
              return failure;
            }}
          />
        </div>
      )}
    </li>
  );
}

/** A dismissed finding's collapsed row, with Undo */
export function DismissedFinding({
  finding,
  onUndismiss,
}: {
  finding: AiFinding;
  onUndismiss: (findingId: string) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#667085]">
      <IconEyeOff size={14} aria-hidden="true" />
      <span className="flex-1 truncate">Not an issue: “{finding.quote}”</span>
      <button
        type="button"
        onClick={() => onUndismiss(finding.id)}
        className={cn(
          "rounded font-medium text-[#1F5E7A] hover:underline",
          FOCUS,
        )}
      >
        Undo
      </button>
    </li>
  );
}
