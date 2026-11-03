"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReviewComment } from "@/types";
import type { ReviewPanelData } from "@/lib/requests/reviews";
import {
  commentCounts,
  commentSnippet,
  isWholeSection,
  markIdFor,
} from "@/lib/review-comments";
import {
  aiBarState,
  confirmedCount,
  type PanelScore,
} from "@/lib/review-panel/model";
import { AiStatusBar } from "./ai-status-bar";
import { CommentList } from "./comment-list";
import { SectionCard, type RenderDetail } from "./section-card";
import { useSharedReviewComments } from "./review-comments-context";
import { useReviewFocus } from "./review-focus-context";

const POLL_MS = 4000;

type PanelLesson = {
  id: number;
  name: string;
  slug: string;
  orderIndex: number;
};

/**
 * The Reviewer Transcript panel body (ODY-805): AI bar, one card per section,
 * and a footer slot. Scores come from the caller (optimistic state lives above).
 */
export function ReviewPanel({
  droplet,
  panel,
  scores,
  footer,
  onStart,
  starting,
  renderDetail,
  renderActions,
  issuesFor,
  overallExtra,
  meta,
}: {
  droplet: { name: string; slug: string; lessons: PanelLesson[] };
  panel: ReviewPanelData;
  scores: PanelScore[];
  footer?: ReactNode;
  /** Shows Score with AI and Run again; none in ODY-805 */
  onStart?: () => void;
  /** A start request is in flight */
  starting?: boolean;
  renderDetail?: RenderDetail;
  renderActions?: (lessonId: number | null) => ReactNode;
  issuesFor?: (score: PanelScore) => number;
  /** Under the Overall Score card's circles (the summary note) */
  overallExtra?: ReactNode;
  /** The header's "Reviewed by … · Created by …" line */
  meta?: { reviewerName?: string | null; authorNames?: string[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shared = useSharedReviewComments();
  const focus = useReviewFocus();
  const comments = useMemo(() => shared?.comments ?? [], [shared?.comments]);
  const reviewState = shared?.review?.state;

  const lessons = useMemo(
    () => [...droplet.lessons].sort((a, b) => a.orderIndex - b.orderIndex),
    [droplet.lessons],
  );
  const base = `/draft/d/${droplet.slug}`;
  const run = panel.latestRun;
  const polling = run?.runState === "queued" || run?.runState === "running";

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [polling, router]);

  const barState = aiBarState(
    run,
    lessons.map(({ id, name }) => ({ id, name })),
  );
  const counts = confirmedCount(
    lessons.map((l) => l.id),
    panel.criteria,
    scores,
  );

  // A lesson comment belongs to its lesson; others, and ones whose lesson is gone, to the Overview
  const known = new Set(lessons.map((l) => l.id));
  const byLesson = new Map<number, ReviewComment[]>();
  const overview: ReviewComment[] = [];
  const orphans = new Set<number>();
  for (const comment of comments) {
    const lessonId = comment.lesson?.id;
    if (
      comment.field === "blocks" &&
      lessonId !== undefined &&
      known.has(lessonId)
    ) {
      byLesson.set(lessonId, [...(byLesson.get(lessonId) ?? []), comment]);
    } else {
      overview.push(comment);
      if (comment.field === "blocks") orphans.add(comment.id);
    }
  }

  const open = (comment: ReviewComment) => {
    const index = lessons.findIndex((l) => l.id === comment.lesson?.id);
    const onLesson = index >= 0 && comment.field === "blocks";
    focus?.show(
      {
        kind: isWholeSection(comment.anchor) ? "section" : "comment",
        markId: markIdFor(comment),
        lessonId: onLesson ? lessons[index].id : null,
        field: comment.field,
        place: onLesson ? `Lesson ${index + 1}` : "the Overview",
        quote: commentSnippet(comment, undefined),
      },
      onLesson ? `${base}/${lessons[index].slug}` : base,
    );
  };
  const list = (items: ReviewComment[], outdatedIds?: ReadonlySet<number>) => (
    <CommentList
      comments={items}
      positions={panel.positions}
      outdatedIds={outdatedIds}
      onOpen={open}
      focusedMarkId={focus?.focused?.target.markId}
    />
  );
  const total = (items: ReviewComment[]) =>
    commentCounts(items, reviewState).total;
  const scopeScores = (id: number | null) =>
    scores.filter((s) => s.lessonId === id);
  const common = {
    criteria: panel.criteria,
    issuesFor,
    renderDetail,
    renderActions,
  };

  return (
    <section
      aria-label="Reviewer Transcript"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="shrink-0 border-b border-slate-200 px-4 pt-4 pb-3">
        <h2 className="pr-8 text-base font-semibold text-slate-900">
          Reviewer Transcript
        </h2>
        <p className="mt-0.5 truncate text-sm font-medium text-[#344054]">
          {droplet.name}
        </p>
        {meta && (
          <p className="text-xs text-[#667085]">
            {[
              meta.reviewerName && `Reviewed by ${meta.reviewerName}`,
              meta.authorNames?.length &&
                `Created by ${meta.authorNames.join(", ")}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <AiStatusBar
          state={barState}
          counts={counts}
          finishedAt={run?.finishedAt}
          onStart={onStart}
          starting={starting}
          criteriaCount={panel.criteria.length}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <SectionCard
          {...common}
          title="Overview"
          heading="Description, objectives and details"
          eyebrow="Overview"
          kind="overview"
          lessonId={null}
          scores={[]}
          viewing={pathname === base}
          commentCount={total(overview)}
        >
          {list(overview, orphans)}
        </SectionCard>
        {lessons.map((lesson, index) => {
          const items = byLesson.get(lesson.id) ?? [];
          return (
            <SectionCard
              {...common}
              key={lesson.id}
              title={lesson.name}
              eyebrow={`Lesson ${index + 1}`}
              kind="lesson"
              lessonId={lesson.id}
              scores={scopeScores(lesson.id)}
              viewing={pathname === `${base}/${lesson.slug}`}
              commentCount={total(items)}
            >
              {list(items)}
            </SectionCard>
          );
        })}
        <SectionCard
          {...common}
          title="Overall Score"
          kind="overall"
          lessonId={null}
          scores={scopeScores(null)}
          commentCount={0}
        >
          {overallExtra}
        </SectionCard>
      </div>
      {footer}
    </section>
  );
}
