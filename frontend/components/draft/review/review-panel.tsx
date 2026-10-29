"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReviewComment } from "@/types";
import type { ReviewPanelData } from "@/lib/requests/reviews";
import { commentCounts } from "@/lib/review-comments";
import {
  aiBarState,
  confirmedCount,
  type PanelScore,
} from "@/lib/review-panel/model";
import { AiStatusBar } from "./ai-status-bar";
import { CommentList } from "./comment-list";
import { SectionCard, type RenderDetail } from "./section-card";
import { useSharedReviewComments } from "./review-comments-context";

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
  renderDetail,
  renderActions,
  issuesFor,
  overallExtra,
}: {
  droplet: { slug: string; lessons: PanelLesson[] };
  panel: ReviewPanelData;
  scores: PanelScore[];
  footer?: ReactNode;
  /** Shows Score with AI and Run again; none in ODY-805 */
  onStart?: () => void;
  renderDetail?: RenderDetail;
  renderActions?: (lessonId: number | null) => ReactNode;
  issuesFor?: (score: PanelScore) => number;
  /** Under the Overall Score card's circles (the summary note) */
  overallExtra?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shared = useSharedReviewComments();
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
    const lesson = lessons.find((l) => l.id === comment.lesson?.id);
    router.push(
      lesson && comment.field === "blocks" ? `${base}/${lesson.slug}` : base,
    );
  };
  const list = (items: ReviewComment[], outdatedIds?: ReadonlySet<number>) => (
    <CommentList
      comments={items}
      positions={panel.positions}
      outdatedIds={outdatedIds}
      onOpen={open}
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <h2 className="text-base font-semibold text-slate-900">
          Reviewer Transcript
        </h2>
        <AiStatusBar
          state={barState}
          counts={counts}
          finishedAt={run?.finishedAt}
          onStart={onStart}
        />
        <SectionCard
          {...common}
          title="Overview"
          kind="overview"
          lessonId={null}
          scores={[]}
          viewing={pathname === base}
          href={base}
          commentCount={total(overview)}
        >
          {list(overview, orphans)}
        </SectionCard>
        {lessons.map((lesson) => {
          const items = byLesson.get(lesson.id) ?? [];
          return (
            <SectionCard
              {...common}
              key={lesson.id}
              title={lesson.name}
              kind="lesson"
              lessonId={lesson.id}
              scores={scopeScores(lesson.id)}
              viewing={pathname === `${base}/${lesson.slug}`}
              href={`${base}/${lesson.slug}`}
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
