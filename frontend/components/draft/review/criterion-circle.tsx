"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { BAND_COLORS } from "@/lib/review-panel/colors";
import { criterionIcon } from "@/lib/review-panel/criteria-icons";
import { bandOf, circleLabel, issuesText } from "@/lib/review-panel/model";

const BADGE = { good: "✓", ok: "–", needs_work: "✕" } as const;

/**
 * One criterion's score circle (ODY-805): its effective score in the band's
 * colour, dashed when not scored. `suggested` is an AI score nobody confirmed.
 */
export const CriterionCircle = forwardRef<
  HTMLButtonElement,
  {
    name: string;
    /** value ?? aiValue */
    value: number | null;
    issues: number;
    suggested?: boolean;
    expanded: boolean;
    controlsId: string;
    onToggle: () => void;
  }
>(function CriterionCircle(
  { name, value, issues, suggested = false, expanded, controlsId, onToggle },
  ref,
) {
  const band = bandOf(value);
  const colors = BAND_COLORS[band];
  const Icon = criterionIcon(name);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={circleLabel(name, value, issues, suggested)}
      aria-expanded={expanded}
      aria-controls={controlsId}
      data-suggested={suggested}
      onClick={onToggle}
      className="flex w-16 flex-col items-center gap-1 rounded-lg p-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A]"
    >
      <span
        data-circle
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full",
          expanded && "ring-2 ring-[#1F5E7A] ring-offset-2",
          suggested ? "bg-slate-50" : "bg-white",
        )}
        style={{
          borderWidth: 3,
          borderStyle: band === "unscored" ? "dashed" : "solid",
          borderColor: colors.outline,
          color: colors.text,
        }}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {band !== "unscored" && (
          <span
            aria-hidden
            className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: colors.text }}
          >
            {BADGE[band]}
          </span>
        )}
      </span>
      <span aria-hidden className="text-xs font-medium text-slate-800">
        {name}
      </span>
      <span aria-hidden className="text-[11px]" style={{ color: colors.text }}>
        {band === "unscored" ? "Not scored" : issuesText(issues)}
      </span>
    </button>
  );
});
