"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { BAND_COLORS } from "@/lib/review-panel/colors";
import { criterionIcon } from "@/lib/review-panel/criteria-icons";
import { bandOf, circleLabel, issuesText } from "@/lib/review-panel/model";

const COUNT_COLOR = {
  good: "text-[#15803D] dark:text-green-400",
  ok: "text-[#B45309] dark:text-amber-400",
  needs_work: "text-[#B91C1C] dark:text-red-400",
  unscored: "",
} as const;

export const BADGE = { good: "✓", ok: "–", needs_work: "✕" } as const;

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
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 text-center hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A] dark:hover:bg-slate-800 dark:focus-visible:outline-sky-400",
        expanded && "bg-slate-100 dark:bg-slate-800",
      )}
    >
      <span
        data-circle
        className={cn(
          "relative flex aspect-square w-11 max-w-full shrink items-center justify-center rounded-full",
          "bg-white text-[#344054] [--ring-gap:#fff] dark:bg-[#131c2e] dark:text-slate-200 dark:[--ring-gap:#131c2e]",
        )}
        style={{
          boxShadow: expanded
            ? `0 0 0 3px var(--ring-gap), 0 0 0 5px ${colors.outline}`
            : undefined,
          borderWidth: 3,
          borderStyle: band === "unscored" ? "dashed" : "solid",
          borderColor: colors.outline,
          color: band === "unscored" ? colors.outline : undefined,
        }}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {band !== "unscored" && (
          <span
            aria-hidden
            className="absolute -right-1 -bottom-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white dark:border-[#131c2e]"
            style={{ backgroundColor: colors.text }}
          >
            {BADGE[band]}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="text-[11px] leading-tight font-medium whitespace-nowrap text-[#344054] dark:text-slate-200"
      >
        {name}
      </span>
      {band !== "unscored" && (
        <span
          aria-hidden
          className={cn(
            "text-[10px] leading-none whitespace-nowrap",
            issues ? COUNT_COLOR[band] : "text-[#667085] dark:text-slate-400",
          )}
        >
          {issuesText(issues)}
        </span>
      )}
    </button>
  );
});
