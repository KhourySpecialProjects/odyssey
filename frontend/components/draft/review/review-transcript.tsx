"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AiFinding, Droplet } from "@/types";
import type { ReviewPanelData } from "@/lib/requests/reviews";
import { ContentActionButton } from "@/components/draft/metadata/content-action-button";
import { useDismissedFindings } from "@/hooks/use-dismissed-findings";
import { useReviewScores } from "@/hooks/use-review-scores";
import { useSummaryNote } from "@/hooks/use-summary-note";
import {
  cardStatus,
  overallConfirmed,
  visibleFindings,
  type PanelScore,
} from "@/lib/review-panel/model";
import { ConfirmScores } from "./confirm-scores";
import { CriterionDetail } from "./criterion-detail";
import { ReviewPanel } from "./review-panel";
import { useSharedReviewComments } from "./review-comments-context";

const NO_SCORES: PanelScore[] = [];
const SUMMARY_NOTE_MAX = 5000;

type TranscriptDroplet = Pick<
  Droplet,
  "id" | "name" | "slug" | "status" | "inReview" | "lessons"
>;

/** The panel with its scores, dismissals, summary note and footer actions wired (ODY-805) */
export function ReviewTranscript({
  droplet,
  panel,
  onScoresChange,
}: {
  droplet: TranscriptDroplet;
  /** Null when the scores didn't load: the footer still shows */
  panel: ReviewPanelData | null;
  /** Tells the shell the live scores, for the sidebar dots */
  onScoresChange?: (scores: PanelScore[] | null) => void;
}) {
  const router = useRouter();
  const noteId = useId();
  const shared = useSharedReviewComments();
  const { scores, confirm, undo, change, pendingScope } = useReviewScores(
    panel?.scores ?? NO_SCORES,
  );
  useEffect(() => {
    onScoresChange?.(scores);
  }, [scores, onScoresChange]);
  useEffect(() => () => onScoresChange?.(null), [onScoresChange]);
  const reviewId = panel?.review?.id ?? shared?.review?.id;
  const { dismissed, dismiss, undismiss } = useDismissedFindings(reviewId);
  const { note, setNote } = useSummaryNote(reviewId);

  const lessons = [...(droplet.lessons ?? [])].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const base = `/draft/d/${droplet.slug}`;
  const lessonUrl = (id: number | null) => {
    const lesson = lessons.find((l) => l.id === id);
    return lesson ? `${base}/${lesson.slug}` : base;
  };
  const lessonTag = (id: number | null) => {
    const index = lessons.findIndex((l) => l.id === id);
    return index < 0 ? "Overview" : `Lesson ${index + 1}`;
  };

  const disabledReason = !panel
    ? "Couldn't load scores. Reload to try again."
    : overallConfirmed(panel.criteria, scores)
      ? undefined
      : "Confirm the Overall Score to publish. Every criterion needs a confirmed score.";

  const footer = (
    <footer className="space-y-2 border-t border-slate-200 p-4 dark:border-slate-700">
      <ContentActionButton
        droplet={droplet as Droplet}
        actionType="publishWithReview"
        buttonText="Publish droplet"
        disabledReason={disabledReason}
      />
      <ContentActionButton
        droplet={droplet as Droplet}
        actionType="sendFeedback"
        buttonText="Send feedback"
        initialNote={note}
      />
    </footer>
  );

  if (!panel) {
    return (
      <section
        aria-label="Reviewer Transcript"
        className="flex h-full min-h-0 flex-col"
      >
        <div className="flex-1 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            Reviewer Transcript
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            The scores couldn&apos;t be loaded. You can still send feedback.
          </p>
        </div>
        {footer}
      </section>
    );
  }

  const scoreFor = (criterionId: number, lessonId: number | null) =>
    scores.find(
      (s) => s.criterionId === criterionId && s.lessonId === lessonId,
    );
  const scopeKey = (lessonId: number | null) => lessonId ?? "overall";

  const summaryNote: ReactNode = (
    <div className="mt-3">
      <label
        htmlFor={noteId}
        className="mb-1 block text-xs font-medium text-slate-700"
      >
        Summary note (optional)
      </label>
      <textarea
        id={noteId}
        value={note}
        maxLength={SUMMARY_NOTE_MAX}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-slate-300 p-2 text-sm"
      />
      <p className="mt-1 text-[11px] text-slate-500">
        Kept in this browser. It pre-fills Send feedback.
      </p>
    </div>
  );

  return (
    <ReviewPanel
      droplet={{ slug: droplet.slug, lessons }}
      panel={panel}
      scores={scores}
      footer={footer}
      overallExtra={summaryNote}
      issuesFor={(s) =>
        (s.aiFindings ?? []).filter((f) => !dismissed.has(f.id)).length
      }
      renderActions={(lessonId) => (
        <ConfirmScores
          status={cardStatus(
            panel.criteria,
            scores.filter((s) => s.lessonId === lessonId),
          )}
          pending={pendingScope.has(scopeKey(lessonId))}
          onConfirm={() => confirm(lessonId)}
          onUndo={() => undo(lessonId)}
        />
      )}
      renderDetail={({ criterion, lessonId, close }) => {
        const score = scoreFor(criterion.id, lessonId);
        const all: AiFinding[] = score?.aiFindings ?? [];
        return (
          <CriterionDetail
            key={criterion.id}
            criterion={criterion}
            score={score}
            lessonId={lessonId}
            findings={visibleFindings(
              { aiFindings: all },
              dismissed,
              panel.positions,
            )}
            dismissedFindings={all.filter((f) => dismissed.has(f.id))}
            onDismiss={dismiss}
            onUndismiss={undismiss}
            onChange={(value) => change(criterion.id, lessonId, value)}
            onClose={close}
            onShowInLesson={(f) =>
              router.push(lessonUrl(f.lessonId ?? lessonId))
            }
            lessonLabel={
              lessonId === null ? (f) => lessonTag(f.lessonId) : undefined
            }
            pending={pendingScope.has(scopeKey(lessonId))}
          />
        );
      }}
    />
  );
}
