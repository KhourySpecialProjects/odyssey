"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ReviewAnchor, ReviewComment } from "@/types";
import { OVERVIEW_TEXT_FIELDS, overviewFieldHtml } from "@/lib/review-overview";
import {
  FrozenOverview,
  TITLE_CLASS,
  type OverviewField,
  type OverviewSection,
} from "@/components/draft/metadata/frozen-overview";
import { settleDropletUpdates } from "@/components/draft/metadata/hooks/useDropletUpdate";
import { useShowInLesson } from "@/hooks/use-show-in-lesson";
import { useDropletReviewComments } from "./review-comments-context";
import { useReviewFocus } from "./review-focus-context";
import {
  commentCounts,
  isOutdatedMark,
  isWholeSection,
  numberComments,
} from "@/lib/review-comments";
import { ReviewModeBar, type ReviewMode } from "./review-mode-bar";
import { CommentLayer } from "./comment-layer";
import { ReviewTextView } from "./review-text-view";
import { OutdatedComments } from "./outdated-comments";
import { CommentStrip } from "./comment-strip";
import { SectionComments } from "./section-comments";
import {
  CommentKeyboardButton,
  CommentKeyboardProvider,
} from "./comment-keyboard";

const NONE: ReviewComment[] = [];
const FIELDS: readonly OverviewField[] = OVERVIEW_TEXT_FIELDS;

type OverviewReviewProps = Omit<
  React.ComponentProps<typeof FrozenOverview>,
  "renderField"
> & {
  dropletId: number;
  /** The Overview's editors, for Edit mode */
  children: ReactNode;
};

/**
 * The Overview for a reviewer of a droplet in review (ODY-806, Task 8):
 * Comment (the read-only Overview with comments on the text of its title,
 * description, overview and learning objectives, and on any whole section
 * from its heading), Read, or Edit (the editors). Text comments anchor by
 * quote within each field; all are numbered across the Overview.
 */
export function OverviewReview({
  droplet,
  authors,
  dropletId,
  children,
}: OverviewReviewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ReviewMode>("comment");
  const stopEditing = () => {
    // Send the editors' last change now, and once every save has finished,
    // reload the page data so Comment mode shows the edits
    void settleDropletUpdates().then(() => router.refresh());
    setMode("comment");
  };
  const commenting = mode === "comment";
  const reviewComments = useDropletReviewComments(dropletId, true);
  const { review, add, edit, remove, resolve } = reviewComments;

  const comments = useMemo(
    () => reviewComments.comments.filter((c) => c.field !== "blocks"),
    [reviewComments.comments],
  );
  const numbers = useMemo(() => numberComments(comments), [comments]);
  // Each field's text comments and each section's whole ones, built once per
  // change: a new list makes ReviewTextView rewrite its text, which would
  // drop a selection being dragged out
  const grouped = useMemo(() => {
    const text = new Map<string, ReviewComment[]>();
    const whole = new Map<string, ReviewComment[]>();
    for (const c of comments) {
      const into = isWholeSection(c.anchor) ? whole : text;
      into.set(c.field, [...(into.get(c.field) ?? []), c]);
    }
    return { text, whole };
  }, [comments]);
  // The open criterion's findings with no lesson, per field (memoized: a new
  // list makes ReviewTextView redraw)
  const focus = useReviewFocus();
  const openDetail = focus?.openDetail;
  const focusedId = focus?.focused?.target.markId;
  const findingsByField = useMemo(() => {
    const byField = new Map<
      string,
      NonNullable<typeof openDetail>["findings"]
    >();
    for (const item of openDetail?.findings ?? []) {
      if (item.finding.lessonId !== null) continue;
      const { field } = item.finding.anchor;
      byField.set(field, [...(byField.get(field) ?? []), item]);
    }
    return byField;
  }, [openDetail]);
  const [draft, setDraft] = useState<{
    field: OverviewField;
    anchor: ReviewAnchor;
  } | null>(null);
  const [litMarkId, setLitMarkId] = useState<string | null>(null);
  const [outdated, setOutdated] = useState<
    Record<OverviewField, ReviewComment[]>
  >({ name: [], description: [], overview: [], objective: [] });

  const html: Record<OverviewField, string> = useMemo(
    () =>
      overviewFieldHtml(
        {
          name: droplet.name,
          description: droplet.description,
          overview: droplet.overview,
          objectives: (droplet.learningObjectives ?? []).map(
            (o) => o.objective,
          ),
        },
        { titleClass: TITLE_CLASS },
      ),
    [
      droplet.name,
      droplet.description,
      droplet.overview,
      droplet.learningObjectives,
    ],
  );

  const reportOutdated = useCallback(
    (field: OverviewField) => (list: ReviewComment[]) =>
      setOutdated((current) =>
        current[field].length === list.length &&
        current[field].every((c, i) => c.id === list[i].id)
          ? current
          : { ...current, [field]: list },
      ),
    [],
  );
  const reporters = useMemo(
    () =>
      Object.fromEntries(FIELDS.map((f) => [f, reportOutdated(f)])) as Record<
        OverviewField,
        (list: ReviewComment[]) => void
      >,
    [reportOutdated],
  );
  const outdatedIds = useMemo(
    () => new Set(Object.values(outdated).flatMap((l) => l.map((c) => c.id))),
    [outdated],
  );
  const canChange = !review || review.state === "open";
  // Show in lesson from the panel: leave Read or Edit for Comment, then scroll and ring
  useShowInLesson({
    lessonId: null,
    enabled: true,
    ready: commenting && !reviewComments.isLoading,
    mode,
    onComment: () => (mode === "edit" ? stopEditing() : setMode("comment")),
    isOutdated: (markId) => isOutdatedMark(markId, outdatedIds),
  });

  const renderField = (field: OverviewField, standard: ReactNode) => {
    if (!commenting) return standard;
    const fieldComments = grouped.text.get(field) ?? NONE;
    return (
      <CommentLayer
        enabled
        field={field}
        comments={fieldComments}
        numbers={numbers}
        outdatedIds={outdatedIds}
        blockFor={() => undefined}
        canChange={canChange}
        onPost={(anchor, body) => add({ field, lessonId: null, anchor, body })}
        onEdit={edit}
        onDelete={remove}
        onResolve={resolve}
        onDraftChange={(anchor) => setDraft(anchor ? { field, anchor } : null)}
        litMarkId={litMarkId}
        onLitChange={setLitMarkId}
      >
        <ReviewTextView
          html={html[field]}
          field={field}
          comments={fieldComments}
          reviewState={review?.state}
          draftAnchor={draft?.field === field ? draft.anchor : null}
          litMarkId={litMarkId}
          focusedMarkId={focusedId}
          findings={findingsByField.get(field)}
          band={findingsByField.has(field) ? openDetail?.band : undefined}
          onOutdated={reporters[field]}
          testId={`overview-review-${field}`}
        />
      </CommentLayer>
    );
  };

  const renderSection = (
    section: OverviewSection,
    title: string,
    body: ReactNode,
    standard: ReactNode,
  ) => {
    if (!commenting) return standard;
    return (
      <SectionComments
        field={section}
        title={title}
        comments={grouped.whole.get(section) ?? NONE}
        numbers={numbers}
        canChange={canChange}
        onPost={(anchor, body) =>
          add({ field: section, lessonId: null, anchor, body })
        }
        onEdit={edit}
        onDelete={remove}
        onResolve={resolve}
        litMarkId={litMarkId}
        onLitChange={setLitMarkId}
      >
        {body}
      </SectionComments>
    );
  };

  const allOutdated = FIELDS.flatMap((f) => outdated[f]);

  return (
    <CommentKeyboardProvider>
      <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
        <div className="mx-40 group-data-[review-panel=open]:mx-12">
          <ReviewModeBar
            mode={mode}
            subject="overview"
            onModeChange={setMode}
            onEdit={() => setMode("edit")}
            onStopEditing={stopEditing}
          />
        </div>
        {mode === "edit" ? (
          children
        ) : (
          <>
            {commenting && (
              <div className="mx-40 mb-4 group-data-[review-panel=open]:mx-12">
                <CommentStrip
                  {...commentCounts(comments, review?.state)}
                  place="the Overview"
                  isLoading={reviewComments.isLoading}
                  loadError={!!reviewComments.loadError}
                  sections
                  keyboard={<CommentKeyboardButton />}
                >
                  <OutdatedComments comments={allOutdated} />
                </CommentStrip>
              </div>
            )}
            <FrozenOverview
              droplet={droplet}
              authors={authors}
              renderField={renderField}
              renderSection={renderSection}
            />
            <div className="pb-16" />
          </>
        )}
      </div>
    </CommentKeyboardProvider>
  );
}
