"use client";

import { IconLoader2, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { CEILING_STOP } from "@/lib/review-panel/ai-messages";
import { BAND_COLORS } from "@/lib/review-panel/colors";
import type { AiBarState } from "@/lib/review-panel/model";

const LEGEND = [
  { band: "good", label: "Good 4–5", glyph: "✓" },
  { band: "ok", label: "OK 3", glyph: "–" },
  { band: "needs_work", label: "Needs work 1–2", glyph: "✕" },
  { band: "unscored", label: "Not scored", glyph: "" },
] as const;

// Dark-mode overrides for the inline band colours (need `!` to beat inline style)
const BAND_TEXT_DARK = {
  good: "dark:!text-green-400",
  ok: "dark:!text-amber-400",
  needs_work: "dark:!text-red-400",
  unscored: "",
} as const;

const joinNames = (names: string[]) =>
  names.length < 2
    ? names[0] ?? ""
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

function Bar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
    >
      <div
        className="h-full rounded-full bg-[#2D7597] transition-[width] motion-reduce:transition-none"
        style={{ width: `${max ? (value / max) * 100 : 0}%` }}
      />
    </div>
  );
}

/**
 * The panel's AI status (ODY-805): what the latest run is doing, and the score
 * legend. Score with AI and Run again show only when `onStart` is given.
 */
export function AiStatusBar({
  state,
  counts,
  onStart,
  starting = false,
  criteriaCount,
}: {
  state: AiBarState;
  counts: { confirmed: number; total: number };
  onStart?: () => void;
  /** A start request is in flight */
  starting?: boolean;
  criteriaCount?: number;
}) {
  const run = (busy: boolean) => () => {
    if (!busy) onStart?.();
  };
  // The filled button of the Not scored card; disabled while a start or run is going
  const primary = (label: string, running = false) => {
    const busy = starting || running;
    return (
      onStart && (
        <button
          type="button"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={run(busy)}
          className={cn(
            "mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2D7597] px-3.5 text-sm font-medium text-white shadow-sm hover:bg-[#255e78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F5E7A] dark:focus-visible:outline-sky-400",
            busy && "cursor-wait opacity-60",
          )}
        >
          <IconSparkles className="h-4 w-4" aria-hidden />
          {starting ? "Starting…" : label}
        </button>
      )
    );
  };
  // The quiet link next to the count: Run again
  const link = (label: string, running = false) => {
    const busy = starting || running;
    return (
      onStart && (
        <button
          type="button"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={run(busy)}
          className={cn(
            "inline-flex items-center gap-1 text-xs text-[#1F5E7A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A] dark:text-sky-300 dark:focus-visible:outline-sky-400",
            busy && "cursor-wait opacity-60",
          )}
        >
          <IconRefresh className="h-3.5 w-3.5" aria-hidden />
          {starting ? "Starting…" : label}
        </button>
      )
    );
  };
  const scored = state.kind === "scored" || state.kind === "partial";

  return (
    <div>
      {state.kind === "none" && (
        <div className="mt-3 rounded-lg border border-dashed border-[#2D7597]/50 bg-[#287697]/5 p-3">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Not scored yet
          </p>
          <p className="mt-0.5 text-xs text-[#475467] dark:text-slate-300">
            AI scores each lesson and the whole droplet
            {criteriaCount ? ` on ${criteriaCount} criteria` : ""} and points to
            the passages behind each score. You confirm every score yourself
            before the authors see it, and you can score by hand at any time.
          </p>
          {primary("Score with AI")}
        </div>
      )}
      {state.kind === "scoring" && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-[#33425c] dark:bg-[#131c2e]"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            <IconLoader2
              className="h-4 w-4 animate-spin text-[#2D7597] motion-reduce:animate-none"
              aria-hidden
            />
            {state.indeterminate
              ? "Scoring every lesson. You can keep reviewing."
              : state.currentName
                ? `Scoring ${state.currentName}…`
                : "Scoring…"}
          </p>
          {state.indeterminate ? (
            <div
              role="progressbar"
              aria-label="AI scoring progress"
              aria-busy="true"
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            >
              <div className="h-full w-full animate-pulse rounded-full bg-[#2D7597]/60 motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              <div className="mt-2">
                <Bar
                  value={state.done}
                  max={state.total}
                  label="AI scoring progress"
                />
              </div>
              <p className="mt-1.5 text-xs text-[#667085] dark:text-slate-400">
                {state.done} of {state.total} done. You can keep reading while
                it runs.
              </p>
            </>
          )}
          {primary("Scoring with AI…", true)}
        </div>
      )}
      {scored && (
        <div className="mt-3">
          {state.kind === "partial" && <FailedText state={state} />}
          <div className="flex items-center justify-between text-xs text-[#344054] dark:text-slate-200">
            <span>
              <b className="font-semibold text-slate-900 dark:text-slate-100">
                {counts.confirmed} of {counts.total}
              </b>{" "}
              confirmed
            </span>
            {link("Run again")}
          </div>
        </div>
      )}
      {state.kind === "failed" && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <FailedText state={state} />
          {primary("Run again")}
        </div>
      )}
      <ul
        aria-label="Key"
        className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#475467] dark:text-slate-300"
      >
        {LEGEND.map(({ band, label, glyph }) => (
          <li
            key={band}
            className="inline-flex items-center gap-0.5 whitespace-nowrap"
          >
            <span
              aria-hidden
              className="inline-flex h-3 w-3 rounded-full bg-white dark:bg-slate-900"
              style={{
                border: `2px ${band === "unscored" ? "dashed" : "solid"} ${BAND_COLORS[band].outline}`,
              }}
            />
            {glyph && (
              <span
                aria-hidden
                className={cn("text-[11px] leading-none", BAND_TEXT_DARK[band])}
                style={{ color: BAND_COLORS[band].text }}
              >
                {glyph}
              </span>
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FailedText({
  state: { failedNames: names, atCeiling },
}: {
  state: Extract<AiBarState, { kind: "partial" | "failed" }>;
}) {
  return (
    <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
      {atCeiling
        ? `${CEILING_STOP} Not scored: ${joinNames(names)}.`
        : names.length
          ? `Couldn't score ${joinNames(names)}.`
          : "Some sections couldn't be scored."}
    </p>
  );
}
