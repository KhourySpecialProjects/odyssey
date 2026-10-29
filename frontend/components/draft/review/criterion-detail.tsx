"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { IconCheck, IconMinus, IconX, type Icon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BAND_COLORS, BAND_LABEL, type Band } from "@/lib/review-panel/colors";
import { bandOf, effective, type PanelScore } from "@/lib/review-panel/model";
import type { PanelCriterion } from "@/lib/requests/reviews";
import type { AiFinding } from "@/types";
import { DismissedFinding, FindingItem } from "./finding-item";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7597] focus-visible:ring-offset-1";

const BAND_GLYPH: Partial<Record<Band, Icon>> = {
  good: IconCheck,
  ok: IconMinus,
  needs_work: IconX,
};

const VALUES = [1, 2, 3, 4, 5];

export type CriterionDetailProps = {
  criterion: PanelCriterion;
  score: PanelScore | undefined;
  /** Null: the Overall Score */
  lessonId: number | null;
  /** Findings not dismissed, numbered in reading order */
  findings: { finding: AiFinding; number: number }[];
  dismissedFindings: AiFinding[];
  onDismiss: (findingId: string) => void;
  onUndismiss: (findingId: string) => void;
  onChange: (value: number) => void;
  onClose: () => void;
  /** Shown only when given */
  onShowInLesson?: (finding: AiFinding) => void;
  /** The lesson tag on an Overall finding */
  lessonLabel?: (finding: AiFinding) => string | null;
  pending?: boolean;
};

/** A criterion's open detail: score, reason, transgressions and the change control */
export function CriterionDetail({
  criterion,
  score,
  lessonId,
  findings,
  dismissedFindings,
  onDismiss,
  onUndismiss,
  onChange,
  onClose,
  onShowInLesson,
  lessonLabel,
  pending,
}: CriterionDetailProps) {
  const value = score ? effective(score) : null;
  const band = bandOf(value);
  const colour = BAND_COLORS[band];
  const Glyph = BAND_GLYPH[band];
  const unscored = value === null;
  const changed =
    score?.value != null &&
    score.aiValue != null &&
    score.value !== score.aiValue;

  const [expanded, setExpanded] = useState(changed);
  const showControl = unscored || expanded;
  const [focusValue, setFocusValue] = useState<number | null>(null);
  const radios = useRef<Record<number, HTMLButtonElement | null>>({});

  const onRegionKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onClose();
  };

  const onRadioKey = (e: KeyboardEvent, n: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (!step) return;
    e.preventDefault();
    const next = ((n - 1 + step + VALUES.length) % VALUES.length) + 1;
    setFocusValue(next);
    radios.current[next]?.focus();
  };

  const total = findings.length;
  const noFindings = total === 0 && dismissedFindings.length === 0;

  return (
    <div
      role="region"
      aria-label={`${criterion.name} details`}
      aria-busy={pending || undefined}
      onKeyDown={onRegionKey}
      className="mx-1 mt-2 rounded-lg border bg-slate-50 p-3"
      style={{ borderColor: colour.outline }}
    >
      <div className="flex items-start gap-2.5">
        <span
          title={unscored ? "Not scored" : `${value} out of 5`}
          className="flex h-11 w-11 shrink-0 cursor-default items-center justify-center rounded-lg text-white"
          style={{ background: colour.outline }}
        >
          <span className="text-xl leading-none font-bold" aria-hidden="true">
            {unscored ? "–" : value}
          </span>
          <span className="sr-only">
            {unscored ? "Not scored" : `${value} out of 5`}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">
              {criterion.name}
            </span>
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold"
              style={{ color: colour.text, background: `${colour.outline}1F` }}
            >
              {Glyph && <Glyph size={11} aria-hidden="true" />}
              {BAND_LABEL[band]}
            </span>
            {changed && (
              <span className="text-[11px] text-[#667085]">
                · changed by you (AI: {score?.aiValue})
              </span>
            )}
          </div>
          {score?.aiRationale && (
            <p className="mt-1 text-xs leading-snug text-[#475467]">
              <span className="font-medium text-[#344054]">Why:</span>{" "}
              {score.aiRationale}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Close ${criterion.name} details`}
          onClick={onClose}
          className={cn(
            "-mt-1 -mr-1 rounded p-1 text-[#667085] hover:bg-white",
            FOCUS,
          )}
        >
          <IconX size={16} aria-hidden="true" />
        </button>
      </div>

      {!unscored && (
        <>
          <p className="mt-3 text-xs font-semibold tracking-wide text-[#667085] uppercase">
            Transgressions · {total}
          </p>
          {noFindings ? (
            <p className="mt-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-xs text-[#667085]">
              Nothing in this {lessonId === null ? "droplet" : "lesson"} cost
              points on {criterion.name}.
            </p>
          ) : (
            <ol className="-mx-1 mt-1 space-y-1">
              {findings.map(({ finding, number }) => (
                <FindingItem
                  key={finding.id}
                  finding={finding}
                  number={number}
                  band={band}
                  lessonLabel={lessonLabel?.(finding)}
                  onShowInLesson={onShowInLesson}
                  onDismiss={onDismiss}
                />
              ))}
              {dismissedFindings.map((finding) => (
                <DismissedFinding
                  key={finding.id}
                  finding={finding}
                  onUndismiss={onUndismiss}
                />
              ))}
            </ol>
          )}
        </>
      )}

      <div className="mt-2 text-xs">
        {unscored ? (
          <p
            className="font-medium text-[#344054]"
            id={`score-it-${criterion.id}`}
          >
            Score it yourself
          </p>
        ) : (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className={cn(
              "rounded font-medium text-[#1F5E7A] hover:underline",
              FOCUS,
            )}
          >
            Disagree? Change the score
          </button>
        )}
        {showControl && (
          <div
            role="radiogroup"
            aria-label={unscored ? undefined : `${criterion.name} score`}
            aria-labelledby={unscored ? `score-it-${criterion.id}` : undefined}
            className="mt-2 flex gap-1"
          >
            {VALUES.map((n) => {
              const selected = value === n;
              const c = BAND_COLORS[bandOf(n)].outline;
              const tabbable = focusValue ?? value ?? 1;
              return (
                <button
                  key={n}
                  ref={(el) => {
                    radios.current[n] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={pending || undefined}
                  tabIndex={tabbable === n ? 0 : -1}
                  onKeyDown={(e) => onRadioKey(e, n)}
                  onClick={() => {
                    if (pending || selected) return;
                    // Keep the control (and focus) once a hand score makes it "scored"
                    setExpanded(true);
                    onChange(n);
                  }}
                  className={cn(
                    "h-8 flex-1 rounded-md border border-[#D0D5DD] bg-white text-sm font-semibold text-[#344054]",
                    selected && "text-white",
                    pending && "cursor-wait opacity-60",
                    FOCUS,
                  )}
                  style={
                    selected ? { background: c, borderColor: c } : undefined
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
