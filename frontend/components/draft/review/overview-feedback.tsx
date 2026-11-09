"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ReviewComment } from "@/types";
import { stripHtmlTags } from "@/lib/utils";
import {
  FrozenOverview,
  TITLE_CLASS,
  type OverviewField,
  type OverviewSection,
} from "@/components/draft/metadata/frozen-overview";
import { settleDropletUpdates } from "@/components/draft/metadata/hooks/useDropletUpdate";
import {
  useDropletSentFeedback,
  useThreadSeen,
} from "./review-comments-context";
import { unseenCount } from "@/lib/review-threads";
import {
  isResolved,
  isWholeSection,
  numberComments,
} from "@/lib/review-comments";
import {
  FeedbackLayer,
  closedNoticeEdits,
  refused,
  withClosedNotice,
} from "./feedback-layer";
import {
  FeedbackStrip,
  FeedbackViewToggle,
  type FeedbackView,
} from "./feedback-strip";
import { ReviewTextView } from "./review-text-view";
import { OutdatedComments } from "./outdated-comments";
import { SectionComments } from "./section-comments";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NONE: ReviewComment[] = [];
const FIELDS: OverviewField[] = [
  "name",
  "description",
  "overview",
  "objective",
];

type OverviewFeedbackProps = Omit<
  React.ComponentProps<typeof FrozenOverview>,
  "renderField" | "renderSection"
> & {
  dropletId: number;
  /** False while the draft is back in review: no Edit, no Mark addressed */
  canEdit: boolean;
  /** Replies stay open in both views, even back in review (ODY-881) */
  canReply?: boolean;
  /** Mark addressed, for an author: a reviewer reading the feedback passes false */
  canAddress: boolean;
  /** The Overview without feedback: the editors, or the frozen Overview */
  children: ReactNode;
};

/**
 * The Overview for a droplet's author, or a reviewer reading it, once feedback is sent
 * (ODY-807): Feedback shows the Overview as the reviewer saw it, with their
 * comments marked and numbered and whole-section ones on the headings, and
 * Edit shows the editors. Back in Feedback, the Overview reloads, so a
 * comment whose text was edited away is listed as outdated.
 */
export function OverviewFeedback({
  droplet,
  authors,
  dropletId,
  canEdit,
  canReply = false,
  canAddress,
  children,
}: OverviewFeedbackProps) {
  const router = useRouter();
  const feedback = useDropletSentFeedback(dropletId, true, canAddress);
  const { seen } = useThreadSeen();
  const { review, markAddressed, reply, replyEdits } = feedback;
  const comments = useMemo(
    () => feedback.comments.filter((c) => c.field !== "blocks"),
    [feedback.comments],
  );
  const [mode, setMode] = useState<FeedbackView>("feedback");
  const numbers = useMemo(() => numberComments(comments), [comments]);
  // One list per field, kept between renders: ReviewTextView rewrites its
  // text when its list changes
  const grouped = useMemo(() => {
    const text = new Map<string, ReviewComment[]>();
    const whole = new Map<string, ReviewComment[]>();
    for (const c of comments) {
      const into = isWholeSection(c.anchor) ? whole : text;
      into.set(c.field, [...(into.get(c.field) ?? []), c]);
    }
    return { text, whole };
  }, [comments]);
  const [litMarkId, setLitMarkId] = useState<string | null>(null);
  const [outdated, setOutdated] = useState<
    Record<OverviewField, ReviewComment[]>
  >({ name: [], description: [], overview: [], objective: [] });

  const html: Record<OverviewField, string> = useMemo(
    () => ({
      name: `<h1 class="${TITLE_CLASS}">${escape(droplet.name ?? "")}</h1>`,
      description: `<p>${escape(stripHtmlTags(droplet.description ?? ""))}</p>`,
      overview: droplet.overview ?? "",
      objective: `<ul class="list-disc pl-5">${(
        droplet.learningObjectives ?? []
      )
        .map((o) => `<li>${escape(o.objective)}</li>`)
        .join("")}</ul>`,
    }),
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

  if (!review) return <>{children}</>;

  const lessonComments = (() => {
    const lessons = new Set<number>();
    let total = 0;
    for (const c of feedback.comments) {
      if (c.field !== "blocks" || isResolved(c) || !c.lesson?.id) continue;
      total++;
      lessons.add(c.lesson.id);
    }
    return { total, lessons: lessons.size };
  })();

  const onAddress =
    canEdit && canAddress ? withClosedNotice(markAddressed) : undefined;
  const onReply = canReply ? withClosedNotice(reply) : undefined;
  const showFeedback = mode === "feedback" || !canEdit;

  const renderField = (field: OverviewField) => {
    const fieldComments = grouped.text.get(field) ?? NONE;
    return (
      <FeedbackLayer
        enabled
        comments={fieldComments}
        numbers={numbers}
        outdatedIds={outdatedIds}
        blockFor={() => undefined}
        onAddress={onAddress}
        onReply={onReply}
        replyEdits={replyEdits}
        forCreator={!!canAddress}
        litMarkId={litMarkId}
        onLitChange={setLitMarkId}
      >
        <ReviewTextView
          html={html[field]}
          field={field}
          comments={fieldComments}
          reviewState="sent"
          draftAnchor={null}
          litMarkId={litMarkId}
          onOutdated={reporters[field]}
          testId={`overview-feedback-${field}`}
        />
      </FeedbackLayer>
    );
  };

  const renderSection = (
    section: OverviewSection,
    title: string,
    body: ReactNode,
  ) => (
    <SectionComments
      field={section}
      title={title}
      comments={grouped.whole.get(section) ?? NONE}
      numbers={numbers}
      canChange={false}
      onPost={refused}
      onEdit={refused}
      onDelete={refused}
      onResolve={refused}
      litMarkId={litMarkId}
      onLitChange={setLitMarkId}
      readOnly
      forCreator={!!canAddress}
      onAddress={onAddress}
      onReply={onReply}
      replyEdits={replyEdits && closedNoticeEdits(replyEdits)}
    >
      {body}
    </SectionComments>
  );

  const toggle = canEdit && (
    <FeedbackViewToggle
      label="Overview view"
      view={mode}
      onChange={(value) => {
        if (value === "feedback") {
          // Send the editors' last change, then reload so the comments are
          // found in the edited Overview
          void settleDropletUpdates().then(() => router.refresh());
        }
        setMode(value);
      }}
    />
  );

  const strip = (
    <div className="mx-40 mb-4 group-data-[review-panel=open]:mx-12">
      <FeedbackStrip
        review={review}
        total={comments.length}
        newReplies={unseenCount(comments, seen)}
        addressed={
          comments.filter((c) => c.addressedAt && !isResolved(c)).length
        }
        place="the Overview"
        inReview={!canEdit}
        forReviewer={!canAddress}
        actions={(comments.length > 0 && toggle) || undefined}
        showHint={showFeedback}
        summary
        lessonComments={lessonComments}
      >
        {showFeedback && (
          <OutdatedComments
            comments={FIELDS.flatMap((f) => outdated[f])}
            numbers={numbers}
            card={{
              canChange: false,
              onEdit: refused,
              onDelete: refused,
              onResolve: refused,
              onAddress,
              onReply,
              replyEdits: replyEdits && closedNoticeEdits(replyEdits),
              forCreator: !!canAddress,
            }}
          />
        )}
      </FeedbackStrip>
    </div>
  );

  const overview = (
    <FrozenOverview
      droplet={droplet}
      authors={authors}
      renderField={renderField}
      renderSection={renderSection}
    />
  );

  // Feedback on lessons only: the note and where to look, then the Overview
  if (comments.length === 0) {
    return canEdit ? (
      <div className="bg-white pt-6 dark:bg-zinc-950">
        {strip}
        {children}
      </div>
    ) : (
      <>
        {strip}
        {children}
      </>
    );
  }

  // Frozen, the page around it already holds the Overview's frame
  if (!canEdit) {
    return (
      <>
        {strip}
        {overview}
      </>
    );
  }
  return (
    <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
      {strip}
      {showFeedback ? (
        <>
          {overview}
          <div className="pb-16" />
        </>
      ) : (
        children
      )}
    </div>
  );
}
