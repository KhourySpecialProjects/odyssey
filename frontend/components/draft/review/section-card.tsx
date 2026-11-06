"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconMessage2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  bandOf,
  cardStatus,
  effective,
  issuesText,
  type PanelScore,
} from "@/lib/review-panel/model";
import { BAND_LABEL } from "@/lib/review-panel/colors";
import type { PanelCriterion } from "@/lib/requests/reviews";
import { CriterionCircle } from "./criterion-circle";
import { MiniCriterionCircle } from "./mini-criterion-circle";

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
  const [expanded, setExpanded] = useState(false);
  const [commentsShown, setCommentsShown] = useState(true);
  const [seenCount, setSeenCount] = useState(commentCount);
  // A new comment re-shows a hidden list (adjusted during render, not in an effect)
  if (commentCount !== seenCount) {
    setSeenCount(commentCount);
    if (commentCount > seenCount) setCommentsShown(true);
  }
  const circles = useRef(new Map<number, HTMLButtonElement | null>());
  const key = lessonId ?? kind;
  const detailId = `review-detail-${lessonId ?? "overall"}`;
  const commentsId = `review-comments-${key}`;
  const bodyId = `review-card-${key}`;
  const scored = kind !== "overview";
  const status = scored ? cardStatus(criteria, scores) : "not_scored";
  const open = criteria.find((c) => c.id === openId);
  const rows = criteria.map((criterion) => {
    const score = scores.find((s) => s.criterionId === criterion.id);
    return {
      criterion,
      value: score ? effective(score) : null,
      issues: score ? issuesFor(score) : 0,
      suggested: !!score && score.value === null && score.aiValue !== null,
    };
  });
  const summary = rows
    .map(({ criterion, value, issues }) => {
      const band = BAND_LABEL[bandOf(value)];
      return `${criterion.name} ${band}${issues ? `, ${issuesText(issues)}` : ""}`;
    })
    .join("; ");

  const close = () => {
    const id = openId;
    setOpenId(null);
    if (id !== null) circles.current.get(id)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
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
      {rows.map(({ criterion, value, issues, suggested }) => (
        <CriterionCircle
          key={criterion.id}
          ref={(el) => {
            circles.current.set(criterion.id, el);
          }}
          name={criterion.name}
          value={value}
          issues={issues}
          suggested={suggested}
          expanded={openId === criterion.id}
          controlsId={detailId}
          onToggle={() =>
            setOpenId(openId === criterion.id ? null : criterion.id)
          }
        />
      ))}
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
        "rounded-xl border bg-white",
        expanded && "pb-2",
        viewing
          ? "border-[#2D7597] shadow-[0_0_0_1px_#2D7597]"
          : "border-[#D0D5DD]",
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={(event) => {
            event.currentTarget.focus();
            setExpanded(!expanded);
            setOpenId(null);
          }}
          className={cn(
            "flex w-full items-start gap-3 p-3 pb-2 text-left hover:bg-slate-50",
            expanded ? "rounded-t-xl" : "rounded-xl",
            FOCUS,
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="-mb-1 flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden pb-1">
              {eyebrow && (
                <span className="truncate text-xs font-medium text-[#667085]">
                  {eyebrow}
                </span>
              )}
              {viewing && (
                <span className="shrink-0 rounded-full bg-[#287697]/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#1F5E7A]">
                  Viewing
                </span>
              )}
              {status === "to_confirm" &&
                (expanded ? (
                  <>
                    <span aria-hidden className="text-[11px] text-[#667085]">
                      ·
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      To confirm
                    </span>
                  </>
                ) : (
                  <span className="sr-only">To confirm</span>
                ))}
              {status === "confirmed" &&
                (expanded ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#15803D]">
                    <IconCheck className="h-3 w-3" aria-hidden />
                    <span>Confirmed</span>
                  </span>
                ) : (
                  <span className="sr-only">Confirmed</span>
                ))}
              {scored && !expanded && (
                <span className="flex shrink-0 gap-1 pr-1">
                  {rows.map(({ criterion, value, suggested }) => (
                    <MiniCriterionCircle
                      key={criterion.id}
                      name={criterion.name}
                      value={value}
                      suggested={suggested}
                    />
                  ))}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
              {heading}
              {scored && rows.length > 0 && <span className="sr-only">,</span>}
            </span>
            {scored && rows.length > 0 && (
              <span className="sr-only">scores: {summary},</span>
            )}
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
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>
      </h3>
      <div id={bodyId}>
        {expanded && (
          <>
            {kind === "overview" && (
              <p className="px-3 text-xs text-[#667085]">
                The Overview isn&apos;t scored on its own. It counts toward the
                Overall Score below.
              </p>
            )}
            {circleRow}
            {detail}
            {scored && renderActions?.(lessonId)}
            <div className="mt-2 border-t border-slate-200 px-2 pt-2 pb-1">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs font-semibold tracking-wide text-[#667085] uppercase">
                  Comments · {commentCount}
                </p>
                {commentCount > 0 && (
                  <button
                    type="button"
                    aria-controls={commentsId}
                    aria-label={
                      commentsShown ? "Hide comments" : "Show comments"
                    }
                    onClick={(event) => {
                      event.currentTarget.focus();
                      setCommentsShown(!commentsShown);
                    }}
                    className={cn(
                      "-my-1 inline-flex min-h-6 items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#475467] hover:bg-slate-50",
                      FOCUS,
                    )}
                  >
                    {commentsShown ? (
                      <IconEyeOff className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <IconEye className="h-3.5 w-3.5" aria-hidden />
                    )}
                    <span aria-hidden>{commentsShown ? "Hide" : "Show"}</span>
                  </button>
                )}
              </div>
              <div id={commentsId}>
                {commentCount === 0 && (
                  <p className="text-xs text-[#667085]">
                    No comments yet. Highlight text in the lesson, or add a
                    transgression as a comment.
                  </p>
                )}
                {commentsShown && children}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
