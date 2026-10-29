"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
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

const STATUS_TEXT = { to_confirm: "To confirm", confirmed: "Confirmed" };

/** One panel card (ODY-805); `renderDetail` and `renderActions` fill its slots. */
export function SectionCard({
  title,
  kind,
  lessonId,
  criteria,
  scores,
  viewing = false,
  href,
  commentCount,
  children,
  issuesFor = (s) => s.aiFindings?.length ?? 0,
  renderDetail,
  renderActions,
}: {
  title: string;
  kind: "overview" | "lesson" | "overall";
  lessonId: number | null;
  criteria: PanelCriterion[];
  /** Only this card's scores */
  scores: PanelScore[];
  viewing?: boolean;
  href?: string;
  commentCount: number;
  children?: ReactNode;
  issuesFor?: (score: PanelScore) => number;
  renderDetail?: RenderDetail;
  renderActions?: (lessonId: number | null) => ReactNode;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const circles = useRef(new Map<number, HTMLButtonElement | null>());
  const headingId = `review-card-${lessonId ?? kind}`;
  const detailId = `review-detail-${lessonId ?? "overall"}`;
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

  return (
    <section
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-xl border bg-white p-3",
        viewing ? "border-[#1F5E7A]" : "border-slate-200",
      )}
    >
      <div className="flex items-center gap-2">
        <h3 id={headingId} className="text-sm font-semibold text-slate-900">
          {href ? (
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {viewing && (
          <span className="rounded-full bg-[#1F5E7A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1F5E7A]">
            Viewing
          </span>
        )}
        {status !== "not_scored" && (
          <span className="ml-auto text-xs font-medium text-slate-600">
            {STATUS_TEXT[status]}
          </span>
        )}
      </div>
      {kind === "overview" && (
        <p className="mt-0.5 text-xs text-slate-500">
          The Overview isn&apos;t scored on its own.
        </p>
      )}
      <p className="mt-0.5 text-xs text-slate-500">
        {commentCount} {commentCount === 1 ? "comment" : "comments"}
      </p>

      {scored && (
        <div className="mt-2 flex flex-wrap gap-1">
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
      )}
      {scored && open && (
        <div id={detailId} className="mt-2">
          {renderDetail?.({ criterion: open, lessonId, close })}
        </div>
      )}
      {scored && renderActions?.(lessonId)}
      {children}
    </section>
  );
}
