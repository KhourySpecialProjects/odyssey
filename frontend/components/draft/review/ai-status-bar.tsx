"use client";

import { IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BAND_COLORS } from "@/lib/review-panel/colors";
import type { AiBarState } from "@/lib/review-panel/model";

const LEGEND = [
  { band: "good", label: "Good 4–5" },
  { band: "ok", label: "OK 3" },
  { band: "needs_work", label: "Needs work 1–2" },
  { band: "unscored", label: "Not scored" },
] as const;

/** "3 hours ago", from an ISO time */
function ago(iso: string, now = Date.now()): string | null {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  if (Number.isNaN(seconds)) return null;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

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
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className="h-full rounded-full bg-[#1F5E7A] transition-[width]"
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
  finishedAt,
  onStart,
}: {
  state: AiBarState;
  counts: { confirmed: number; total: number };
  finishedAt?: string | null;
  onStart?: () => void;
}) {
  const button = (label: string) =>
    onStart && (
      <button
        type="button"
        onClick={onStart}
        className="mt-2 rounded-md border border-[#1F5E7A] px-3 py-1.5 text-sm font-medium text-[#1F5E7A] hover:bg-[#1F5E7A]/10"
      >
        {label}
      </button>
    );
  const failed = state.kind === "partial" || state.kind === "failed";

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border p-3 text-sm",
          failed ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50",
        )}
      >
        {state.kind === "none" && (
          <>
            <p className="flex items-center gap-1.5 font-semibold text-slate-800">
              <IconSparkles className="h-4 w-4" aria-hidden />
              AI scoring hasn&apos;t run yet
            </p>
            <p className="mt-1 text-slate-600">
              The AI suggests scores and points at passages. You confirm every
              score yourself, and you can score by hand at any time.
            </p>
            {button("Score with AI")}
          </>
        )}
        {state.kind === "scoring" && (
          <>
            <p className="font-semibold text-slate-800">
              {state.currentName ? `Scoring ${state.currentName}…` : "Scoring…"}
            </p>
            <div className="mt-2">
              <Bar
                value={state.done}
                max={state.total}
                label="AI scoring progress"
              />
            </div>
            <p className="mt-1 text-slate-600">
              {state.done} of {state.total} done
            </p>
          </>
        )}
        {(state.kind === "scored" || state.kind === "partial") && (
          <>
            {state.kind === "partial" && (
              <FailedText names={state.failedNames} />
            )}
            <p className="font-semibold text-slate-800">
              {counts.confirmed} of {counts.total} confirmed
            </p>
            <div className="mt-2">
              <Bar
                value={counts.confirmed}
                max={counts.total}
                label="Confirmed scores"
              />
            </div>
            {finishedAt && ago(finishedAt) && (
              <p className="mt-1 text-slate-600">
                Scored by AI {ago(finishedAt)}
              </p>
            )}
            {button("Run again")}
          </>
        )}
        {state.kind === "failed" && (
          <>
            <FailedText names={state.failedNames} />
            {button("Run again")}
          </>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
        {LEGEND.map(({ band, label }) => (
          <li key={band} className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border-2"
              style={{
                borderColor: BAND_COLORS[band].outline,
                borderStyle: band === "unscored" ? "dashed" : "solid",
              }}
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FailedText({ names }: { names: string[] }) {
  return (
    <p className="font-semibold text-red-800">
      {names.length
        ? `Couldn't score ${joinNames(names)}.`
        : "Some sections couldn't be scored."}
    </p>
  );
}
