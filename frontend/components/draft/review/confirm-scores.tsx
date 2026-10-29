"use client";

import { useEffect, useRef } from "react";
import { IconCircleCheckFilled, IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { CardStatus } from "@/lib/review-panel/model";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7597] focus-visible:ring-offset-1";

type Props = {
  status: CardStatus;
  pending?: boolean;
  onConfirm: () => void;
  onUndo: () => void;
};

/** A card's "Confirm scores" row, or "Scores confirmed · Undo"; nothing when unscored */
export function ConfirmScores({ status, pending, onConfirm, onUndo }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  // The button swaps when the status flips; focus follows to its counterpart
  const refocus = useRef(false);
  useEffect(() => {
    if (refocus.current && !pending) {
      refocus.current = false;
      button.current?.focus();
    }
  }, [status, pending]);

  if (status === "not_scored") return null;

  const act = (run: () => void) => () => {
    if (pending) return;
    refocus.current = true;
    run();
  };

  if (status === "confirmed") {
    return (
      <div
        className="mx-1 mt-2 flex items-center gap-1.5 text-xs text-[#15803D]"
        aria-busy={pending || undefined}
      >
        <IconCircleCheckFilled size={14} aria-hidden="true" />
        <span className="font-medium">Scores confirmed</span>
        <button
          ref={button}
          type="button"
          aria-disabled={pending || undefined}
          onClick={act(onUndo)}
          className={cn(
            "ml-auto rounded text-[#667085] hover:underline",
            pending && "cursor-wait opacity-60",
            FOCUS,
          )}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="mx-1 mt-2 flex items-center gap-2 rounded-lg bg-[#287697]/5 px-2 py-1.5 text-xs text-[#344054]">
      <IconSparkles size={14} className="text-[#2D7597]" aria-hidden="true" />
      <span className="flex-1">Suggested by AI. Check them, then confirm.</span>
      <button
        ref={button}
        type="button"
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        onClick={act(onConfirm)}
        className={cn(
          "h-7 rounded-md border border-[#2D7597] bg-white px-2.5 font-medium text-[#1F5E7A] hover:bg-[#287697]/10",
          pending && "cursor-wait opacity-60",
          FOCUS,
        )}
      >
        Confirm scores
      </button>
    </div>
  );
}
