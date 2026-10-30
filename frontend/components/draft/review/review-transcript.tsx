"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AiFinding, Droplet } from "@/types";
import type { ReviewPanelData } from "@/lib/requests/reviews";
import { startAiScoring } from "@/lib/requests/ai-scoring";
import {
  START_FAILED,
  startErrorMessage,
} from "@/lib/review-panel/ai-messages";
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
import { useReviewFocus } from "./review-focus-context";
import { findingMarkId } from "@/lib/review-panel/finding-marks";

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
  meta,
}: {
  droplet: TranscriptDroplet;
  /** Null when the scores didn't load: the footer still shows */
  panel: ReviewPanelData | null;
  /** Tells the shell the live scores, for the sidebar dots */
  onScoresChange?: (scores: PanelScore[] | null) => void;
  /** Names for the header's "Reviewed by … · Created by …" line */
  meta?: { reviewerName?: string | null; authorNames?: string[] };
}) {
  const router = useRouter();
  const noteId = useId();
  const shared = useSharedReviewComments();
  const focus = useReviewFocus();
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

  const [starting, setStarting] = useState(false);
  // Starts a run; the refresh loads the queued run and the panel's polling takes over
  const startScoring = async () => {
    setStarting(true);
    try {
      const result = await startAiScoring(droplet.id);
      if (result.ok) {
        toast.success("Score with AI started. It takes a minute or two.");
        router.refresh();
      } else {
        toast.error(startErrorMessage(result));
      }
    } catch {
      toast.error(START_FAILED);
    } finally {
      setStarting(false);
    }
  };

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

  const confirmed = !!panel && overallConfirmed(panel.criteria, scores);
  const anyScores = scores.some((s) => s.value !== null || s.aiValue !== null);
  const disabledReason = !panel
    ? "Couldn't load scores. Reload to try again."
    : confirmed
      ? undefined
      : anyScores
        ? "Confirm the Overall Score to publish. Send feedback shares only scores you've confirmed."
        : "Score with AI, then confirm the scores to publish. You can send comments at any time.";
  const help =
    disabledReason ??
    "Publishing makes the droplet live. Send feedback returns it to the authors with your comments and confirmed scores.";
  const helpId = useId();

  const footer = (
    <footer className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-700">
      <p
        id={helpId}
        className="mb-2 flex items-start gap-1.5 text-xs text-[#667085]"
      >
        <IconInfoCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{help}</span>
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <ContentActionButton
            droplet={droplet as Droplet}
            actionType="sendFeedback"
            buttonText="Send feedback"
            initialNote={note}
            describedBy={helpId}
          />
        </div>
        <div className="flex-1">
          <ContentActionButton
            droplet={droplet as Droplet}
            actionType="publishWithReview"
            buttonText="Publish droplet"
            disabledReason={disabledReason}
            describedBy={helpId}
          />
        </div>
      </div>
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
          <p className="mt-0.5 truncate text-sm font-medium text-[#344054]">
            {droplet.name}
          </p>
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
        className="block text-sm font-medium text-[#344054]"
      >
        Summary note{" "}
        <span className="font-normal text-[#667085]">(optional)</span>
      </label>
      <textarea
        id={noteId}
        value={note}
        maxLength={SUMMARY_NOTE_MAX}
        rows={2}
        placeholder="Anything the creator should know about the droplet as a whole"
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 w-full resize-y rounded-md border border-slate-300 p-2 text-sm text-slate-900 placeholder:text-[#667085] focus:border-[#2D7597] focus:ring-1 focus:ring-[#2D7597] focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-slate-500">
        Kept in this browser. It pre-fills Send feedback.
      </p>
    </div>
  );

  return (
    <ReviewPanel
      droplet={{ name: droplet.name, slug: droplet.slug, lessons }}
      meta={meta}
      panel={panel}
      scores={scores}
      footer={footer}
      overallExtra={summaryNote}
      onStart={startScoring}
      starting={starting}
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
            focusedMarkId={focus?.focused?.target.markId}
            onShowInLesson={(f) => {
              const wanted = f.lessonId ?? lessonId;
              // A lesson that's gone is the Overview's to answer
              const id = lessons.some((l) => l.id === wanted) ? wanted : null;
              focus?.show(
                {
                  kind: "finding",
                  markId: findingMarkId(f.id),
                  lessonId: id,
                  field: f.anchor.field,
                  place: id === null ? "the Overview" : lessonTag(id),
                  quote: f.quote,
                },
                lessonUrl(id),
              );
            }}
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
