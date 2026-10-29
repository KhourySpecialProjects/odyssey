"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconMessage, IconPencil } from "@tabler/icons-react";
import type { ReviewComment } from "@/types";
import { cn, stripHtmlTags } from "@/lib/utils";
import {
  FrozenOverview,
  TITLE_CLASS,
  type OverviewField,
  type OverviewSection,
} from "@/components/draft/metadata/frozen-overview";
import { settleDropletUpdates } from "@/components/draft/metadata/hooks/useDropletUpdate";
import { useDropletSentFeedback } from "./review-comments-context";
import {
  feedbackMeta,
  isResolved,
  isWholeSection,
  numberComments,
} from "@/lib/review-comments";
import { FeedbackLayer, withClosedNotice } from "./feedback-layer";
import { FeedbackStrip } from "./feedback-strip";
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
const refused = async () => ({
  ok: false as const,
  error: "forbidden" as const,
});

type Mode = "feedback" | "edit";

type OverviewFeedbackProps = Omit<
  React.ComponentProps<typeof FrozenOverview>,
  "renderField" | "renderSection"
> & {
  dropletId: number;
  /** False while the draft is back in review: no Edit, no Mark addressed */
  canEdit: boolean;
  /** The Overview without feedback: the editors, or the frozen Overview */
  children: ReactNode;
};

/**
 * The Overview for a droplet's author once a reviewer has sent feedback on it
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
  children,
}: OverviewFeedbackProps) {
  const router = useRouter();
  const feedback = useDropletSentFeedback(dropletId, true);
  const { review, markAddressed } = feedback;
  const comments = useMemo(
    () => feedback.comments.filter((c) => c.field !== "blocks"),
    [feedback.comments],
  );
  const [mode, setMode] = useState<Mode>("feedback");
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

  const meta = feedbackMeta(review);
  const onAddress = canEdit ? withClosedNotice(markAddressed) : undefined;
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
        meta={meta}
        onAddress={onAddress}
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
      meta={meta}
      onAddress={onAddress}
    >
      {body}
    </SectionComments>
  );

  const toggle = canEdit && (
    <span
      role="group"
      aria-label="Overview view"
      className="inline-flex rounded-lg bg-white/70 p-0.5 dark:bg-[#26324a]"
    >
      {(
        [
          { value: "feedback", label: "Feedback", Icon: IconMessage },
          { value: "edit", label: "Edit", Icon: IconPencil },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => {
            if (value === mode) return;
            if (value === "feedback") {
              // Send the editors' last change, then reload so the comments
              // are found in the edited Overview
              void settleDropletUpdates().then(() => router.refresh());
            }
            setMode(value);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none",
            mode === value
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] dark:bg-[#131c2e] dark:text-slate-50"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
          )}
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              mode === value && "text-[var(--rc-accent-text)]",
            )}
            aria-hidden
          />
          {label}
        </button>
      ))}
    </span>
  );

  const strip = (
    <div className="mx-40 mb-4">
      <FeedbackStrip
        review={review}
        total={comments.length}
        addressed={
          comments.filter((c) => c.addressedAt && !isResolved(c)).length
        }
        place="the Overview"
        inReview={!canEdit}
        actions={(comments.length > 0 && toggle) || undefined}
        showHint={showFeedback}
        summary
        lessonComments={lessonComments}
      >
        {showFeedback && (
          <OutdatedComments comments={FIELDS.flatMap((f) => outdated[f])} />
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
