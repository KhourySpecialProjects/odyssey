"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ReviewAnchor, ReviewComment } from "@/types";
import { stripHtmlTags } from "@/lib/utils";
import {
  FrozenOverview,
  type OverviewField,
} from "@/components/draft/metadata/frozen-overview";
import { useDropletReviewComments } from "./review-comments-context";
import {
  commentCounts,
  commentStripText,
  numberComments,
} from "@/lib/review-comments";
import { ReviewModeBar, type ReviewMode } from "./review-mode-bar";
import { CommentLayer } from "./comment-layer";
import { ReviewTextView } from "./review-text-view";
import { OutdatedComments } from "./outdated-comments";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const FIELDS: OverviewField[] = ["description", "overview", "objective"];
// Longer than the Overview editors' 1 s autosave debounce (useDropletUpdate)
const SAVE_SETTLE_MS = 1500;

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
 * Comment (the read-only Overview with comments on its description,
 * overview and learning objectives), Read, or Edit (the editors). Comments
 * anchor by quote within each field and are numbered across the Overview.
 */
export function OverviewReview({
  droplet,
  authors,
  dropletId,
  children,
}: OverviewReviewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ReviewMode>("comment");
  // The editors autosave a second after the last change; once that has
  // gone, reload the page data so Comment mode shows the edits
  const stopEditing = () => {
    setMode("comment");
    setTimeout(() => router.refresh(), SAVE_SETTLE_MS);
  };
  const commenting = mode === "comment";
  const reviewComments = useDropletReviewComments(dropletId, true);
  const { review, add, edit, remove, resolve } = reviewComments;

  const comments = useMemo(
    () => reviewComments.comments.filter((c) => c.field !== "blocks"),
    [reviewComments.comments],
  );
  const numbers = useMemo(() => numberComments(comments), [comments]);
  const [draft, setDraft] = useState<{
    field: OverviewField;
    anchor: ReviewAnchor;
  } | null>(null);
  const [litMarkId, setLitMarkId] = useState<string | null>(null);
  const [outdated, setOutdated] = useState<
    Record<OverviewField, ReviewComment[]>
  >({ description: [], overview: [], objective: [] });

  const html: Record<OverviewField, string> = useMemo(
    () => ({
      description: `<p>${escape(stripHtmlTags(droplet.description ?? ""))}</p>`,
      overview: droplet.overview ?? "",
      objective: `<ul class="list-disc pl-5">${(
        droplet.learningObjectives ?? []
      )
        .map((o) => `<li>${escape(o.objective)}</li>`)
        .join("")}</ul>`,
    }),
    [droplet.description, droplet.overview, droplet.learningObjectives],
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

  const renderField = (field: OverviewField, standard: ReactNode) => {
    if (!commenting) return standard;
    const fieldComments = comments.filter((c) => c.field === field);
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
          onOutdated={reporters[field]}
          testId={`overview-review-${field}`}
        />
      </CommentLayer>
    );
  };

  const allOutdated = FIELDS.flatMap((f) => outdated[f]);

  return (
    <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
      <div className="mx-40">
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
            <div className="mx-40 mb-4">
              <p
                data-testid="review-comment-strip"
                className="text-sm text-slate-500 dark:text-slate-400"
              >
                {reviewComments.isLoading
                  ? "Loading your comments..."
                  : reviewComments.loadError
                    ? "Couldn't load your comments. Reload to try again."
                    : commentStripText(
                        commentCounts(comments, review?.state),
                        "the Overview",
                      )}
              </p>
              <OutdatedComments comments={allOutdated} />
            </div>
          )}
          <FrozenOverview
            droplet={droplet}
            authors={authors}
            renderField={renderField}
          />
          <div className="pb-16" />
        </>
      )}
    </div>
  );
}
