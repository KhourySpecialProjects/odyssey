"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconCheck, IconChevronDown, IconMessage2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  cardStatus,
  effective,
  type PanelScore,
} from "@/lib/review-panel/model";
import type { PanelCriterion } from "@/lib/requests/reviews";
import { CriterionCircle } from "./criterion-circle";

export type RenderDetail = (args: {
  criterion: PanelCriterion;
  lessonId: number | null;
  close: () => void;
}) => ReactNode;

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A]";

/** One panel card (ODY-805); `renderDetail` and `renderActions` fill its slots. */
export function SectionCard({
  title,
  eyebrow,
  heading = title,
  kind,
  lessonId,
  criteria,
  scores,
  viewing = false,
  commentCount,
  children,
  issuesFor = (s) => s.aiFindings?.length ?? 0,
  renderDetail,
  renderActions,
}: {
  /** The card's name for assistive technology */
  title: string;
  /** Small label above the heading ("Lesson 2") */
  eyebrow?: string;
  /** The visible heading, when it differs from `title` */
  heading?: string;
  kind: "overview" | "lesson" | "overall";
  lessonId: number | null;
  criteria: PanelCriterion[];
  /** Only this card's scores */
  scores: PanelScore[];
  viewing?: boolean;
  commentCount: number;
  /** The comment list (shown when the card is expanded); for Overall, the summary note */
  children?: ReactNode;
  issuesFor?: (score: PanelScore) => number;
  renderDetail?: RenderDetail;
  renderActions?: (lessonId: number | null) => ReactNode;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const circles = useRef(new Map<number, HTMLButtonElement | null>());
  const key = lessonId ?? kind;
  const detailId = `review-detail-${lessonId ?? "overall"}`;
  const commentsId = `review-comments-${key}`;
  const scored = kind !== "overview";
  const status = scored ? cardStatus(criteria, scores) : "not_scored";
  const open = criteria.find((c) => c.id === openId);

  const close = () => {
    const id = openId;
    setOpenId(null);
    if (id !== null) circles.current.get(id)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && openId !== null) {
      event.stopPropagation();
      close();
    }
  };

  const circleRow = scored && (
    <div
      role="group"
      aria-label={`${title} criteria`}
      className="mt-1 grid gap-0.5 px-1"
      style={{
        gridTemplateColumns: `repeat(${Math.max(criteria.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      {criteria.map((criterion) => {
        const score = scores.find((s) => s.criterionId === criterion.id);
        return (
          <CriterionCircle
            key={criterion.id}
            ref={(el) => {
              circles.current.set(criterion.id, el);
            }}
            name={criterion.name}
            value={score ? effective(score) : null}
            issues={score ? issuesFor(score) : 0}
            suggested={
              !!score && score.value === null && score.aiValue !== null
            }
            expanded={openId === criterion.id}
            controlsId={detailId}
            onToggle={() =>
              setOpenId(openId === criterion.id ? null : criterion.id)
            }
          />
        );
      })}
    </div>
  );
  const detail = scored && open && (
    <div id={detailId} className="mt-2">
      {renderDetail?.({ criterion: open, lessonId, close })}
    </div>
  );

  if (kind === "overall") {
    return (
      <section
        aria-label={title}
        onKeyDown={onKeyDown}
        className="rounded-xl border border-[#D0D5DD] bg-white py-3"
      >
        <div className="flex items-baseline justify-between px-3">
          <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
          <span className="text-xs text-[#667085]">Whole droplet</span>
        </div>
        <p className="mt-0.5 mb-2 px-3 text-xs text-[#667085]">
          Questions that need the whole droplet, such as lesson order and
          objective coverage.
        </p>
        {circleRow}
        {detail}
        {renderActions?.(lessonId)}
        <div className="px-3">{children}</div>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-xl border bg-white pb-2",
        viewing
          ? "border-[#2D7597] shadow-[0_0_0_1px_#2D7597]"
          : "border-[#D0D5DD]",
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={commentsOpen}
          aria-controls={commentsId}
          onClick={() => setCommentsOpen((o) => !o)}
          className={cn(
            "flex w-full items-start gap-3 rounded-t-xl p-3 pb-2 text-left hover:bg-slate-50",
            FOCUS,
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {eyebrow && (
                <span className="text-xs font-medium text-[#667085]">
                  {eyebrow}
                </span>
              )}
              {viewing && (
                <span className="rounded-full bg-[#287697]/10 px-2 py-0.5 text-[11px] font-medium text-[#1F5E7A]">
                  Viewing
                </span>
              )}
              {status === "to_confirm" && (
                <>
                  <span aria-hidden className="text-[11px] text-[#667085]">
                    ·
                  </span>
                  <span className="text-[11px] text-[#667085]">To confirm</span>
                </>
              )}
              {status === "confirmed" && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#15803D]">
                  <IconCheck className="h-3 w-3" aria-hidden />
                  <span>Confirmed</span>
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
              {heading}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 pt-0.5 text-[#667085]">
            <span className="inline-flex items-center gap-1 text-xs">
              <IconMessage2 className="h-4 w-4" aria-hidden />
              <span aria-hidden>{commentCount}</span>
              <span className="sr-only">
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </span>
            </span>
            <IconChevronDown
              className={cn(
                "h-[18px] w-[18px] transition-transform motion-reduce:transition-none",
                commentsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>
      </h3>
      {kind === "overview" && (
        <p className="px-3 text-xs text-[#667085]">
          The Overview isn&apos;t scored on its own. It counts toward the
          Overall Score below.
        </p>
      )}
      {circleRow}
      {detail}
      {scored && renderActions?.(lessonId)}
      <div id={commentsId}>
        {commentsOpen && (
          <div className="mt-2 border-t border-slate-200 px-2 pt-2 pb-1">
            <p className="pb-1 text-xs font-semibold tracking-wide text-[#667085] uppercase">
              Comments · {commentCount}
            </p>
            {commentCount === 0 && (
              <p className="text-xs text-[#667085]">
                No comments yet. Highlight text in the lesson, or add a
                transgression as a comment.
              </p>
            )}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
