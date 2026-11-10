"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings, parseSandpackFiles } from "@/lib/utils";
import { User, Droplet, Lesson, AuthorizedUser } from "@/types";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./generic-block-renderer";
import {
  HighlightLayer,
  HighlightableHtml,
  type HighlightDraft,
  type HighlightMerge,
  type HighlightRequest,
} from "./highlight-layer";
import { DetachedHighlights } from "./detached-highlights";
import {
  placeHighlights,
  type HighlightBlock,
  type PlacedHighlight,
} from "@/lib/highlight-placement";
import {
  READER_EVENT,
  REGION_ATTR,
  regionIds,
  regionReader,
} from "@/lib/highlight-regions";
import { useEffect, useMemo, useRef, useState } from "react";
import { LockIcon } from "lucide-react";
import { CalloutSurface } from "@/components/ui/callout-surface";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { toast } from "sonner";
import { Highlight, HighlightColor } from "@/types";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  createHighlight,
  deleteHighlight,
  updateHighlight,
} from "@/lib/requests/highlights";
import { Block } from "@/types";
import { GenericBlock } from "@/components/draft/lesson/blocks/generic";
import posthog from "posthog-js";
import "katex/dist/katex.min.css";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";
import { HighlightDropdown } from "./highlight-dropdown";
import { lessonGate } from "@/lib/lesson-gate";
import {
  useLessonPanelStore,
  useOwnedPanel,
} from "@/stores/lesson-panel-store";
import { HighlightHintBanner } from "./highlight-hint-banner";
import { NotebookCodeViewer } from "@/components/notebook/notebook-code-viewer";
import { PyodideProvider } from "@/lib/pyodide/pyodide-context";
import { DatasetProvider } from "@/lib/contexts/dataset-context";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";

const SandpackViewer = dynamic(
  () =>
    import("@/components/draft/lesson/sandpack-viewer").then(
      (mod) => mod.SandpackViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
    ),
  },
);
import {
  blockNoteIdToNumber,
  displayBlocksOf,
} from "@/lib/blocknote/convert-blocks";
import { blocksToHtml } from "@/lib/strapi-blocks-html";
import { authorByline } from "@/lib/author-names";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<
    Droplet,
    "id" | "lessons" | "name" | "datasets" | "authorized_users"
  >;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
  /** The user's highlights on this lesson, fetched by the lesson page */
  initialHighlights: Highlight[];
  onUpdate: () => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export interface Heading {
  text: string;
  level: number;
}

export function LessonRenderer({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author = false,
  authUser,
  initialHighlights,
  onUpdate,
  expanded,
  setExpanded,
}: LessonRendererProps) {
  // Move all hooks before any early returns.
  // Highlights come from the lesson page, then are kept in sync locally on
  // create/delete (the wrapper is keyed by lesson, so this resets per lesson).
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const panel = useOwnedPanel(lesson.id);
  const mentorAvailable = useLessonPanelStore((s) => s.mentorAvailable);
  const explain = useLessonPanelStore((s) => s.explain);
  // A new highlight is shown under a temporary (negative) id until it's saved
  const nextTempId = useRef(-1);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const firedMilestones = useRef<Set<number>>(new Set());
  // A highlight whose text was deleted, while the reader picks new text for it
  const [movingId, setMovingId] = useState<number | null>(null);

  const displayBlocks = useMemo(
    () =>
      displayBlocksOf({
        blocksVersion: lesson.blocksVersion,
        blocksV2: lesson.blocksV2,
        blocks: lesson.blocks,
      }),
    [lesson.blocksVersion, lesson.blocksV2, lesson.blocks],
  );

  // Highlights are found in each region's text as it's drawn, which needs the
  // browser, so they're placed once the lesson has mounted. A code editor
  // sets its reader once it has loaded, which reads its placement again.
  const [highlightBlocks, setHighlightBlocks] = useState<
    HighlightBlock[] | null
  >(null);
  useEffect(() => {
    const content = lessonContentRef.current;
    if (!content) return;
    const readRegions = () =>
      setHighlightBlocks(
        Array.from(
          content.querySelectorAll<HTMLElement>(`[${REGION_ATTR}]`),
        ).flatMap((region) => {
          const [id, ...sourceBlockIds] = regionIds(region);
          return id === undefined
            ? []
            : [{ id, sourceBlockIds, text: regionReader(region).text() }];
        }),
      );
    readRegions();
    content.addEventListener(READER_EVENT, readRegions);
    return () => content.removeEventListener(READER_EVENT, readRegions);
  }, [displayBlocks]);

  // Where each highlight is now that the author may have edited the lesson.
  // Ones whose text was deleted are listed for the reader instead of drawn.
  const placement = useMemo(
    () =>
      highlightBlocks &&
      placeHighlights(highlights, highlightBlocks, lesson.updatedAt),
    [highlights, highlightBlocks, lesson.updatedAt],
  );
  const placedHighlights: PlacedHighlight[] = placement?.placed ?? [];

  let headings: Heading[] = [];
  displayBlocks
    .filter((b: Block) => b.__component === "droplets.generic")
    .forEach((b: Block) => {
      headings = headings.concat(extractHeadings((b as GenericBlock).content));
    });

  const dropletLessons = droplet.lessons ?? [];
  const lessonIndex = dropletLessons.findIndex((l) => l.id === lesson.id);
  const lessonPosition =
    lessonIndex === -1
      ? null
      : {
          current: lessonIndex + 1,
          total: dropletLessons.length,
          label: `Lesson ${lessonIndex + 1} of ${dropletLessons.length}`,
        };

  const { gate, previous: previousLesson } = lessonGate({
    lessonId: lesson.id,
    lessons: droplet.lessons,
    enrollmentId,
    completedLessonIds,
    author,
    roles: user?.roles,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      window.posthog = posthog;

      if (authUser?.id) {
        posthog.identify(authUser.id.toString());
      }
    }
  }, [authUser?.id]);

  useEffect(() => {
    firedMilestones.current = new Set();
  }, [lesson.id]);

  useEffect(() => {
    if (!enrollmentId) return;

    const MILESTONES = [25, 50, 75, 100];

    function handleScroll() {
      const el = lessonContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      const scrolled = rect.height - (rect.bottom - window.innerHeight);
      const pct = Math.min(100, Math.max(0, (scrolled / rect.height) * 100));
      for (const milestone of MILESTONES) {
        if (pct >= milestone && !firedMilestones.current.has(milestone)) {
          firedMilestones.current.add(milestone);
          posthog.capture("lesson_scroll_depth", {
            percent: milestone,
            lesson_id: lesson.id,
            lesson_name: lesson.name,
            droplet_id: droplet.id,
            user_id: authUser?.id,
          });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lesson.id, droplet.id, enrollmentId, authUser?.id]);

  if (gate === "enroll") {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Enrollment Required
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You must enroll in this droplet to access lessons.
          </p>
        </div>
      </div>
    );
  }

  // Every change shows straight away and is undone if its save fails. A
  // selection over several blocks saves one highlight in each.

  const handleHighlight = async (
    requests: HighlightRequest[],
    { withNote = false }: { withNote?: boolean } = {},
  ): Promise<(Highlight | null)[]> => {
    const saved = await Promise.all(
      requests.map(({ draft, merge }) =>
        merge ? mergeHighlight(draft, merge) : saveHighlight(draft),
      ),
    );
    if (!withNote && saved.every(Boolean)) toast.success("Highlight saved");
    return saved;
  };

  const saveHighlight = async (
    draft: HighlightDraft,
  ): Promise<Highlight | null> => {
    const tempId = nextTempId.current--;
    setHighlights((prev) => [...prev, { ...draft, id: tempId }]);

    const result = await createHighlight({ ...draft, lessonId: lesson.id });
    if (!result.ok) {
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
      toast.error("Failed to save highlight");
      return null;
    }

    const saved: Highlight = { ...draft, id: result.data.id };
    setHighlights((prev) => prev.map((h) => (h.id === tempId ? saved : h)));
    return saved;
  };

  // A selection over saved highlights extends one of them over the rest
  const mergeHighlight = async (
    draft: HighlightDraft,
    { baseId, removeIds }: HighlightMerge,
  ): Promise<Highlight | null> => {
    const base = highlights.find((h) => h.id === baseId);
    const removed = highlights.filter((h) => removeIds.includes(h.id ?? 0));
    if (!base) return null;
    // A highlight holds one note, so two with notes can't become one
    if ([base, ...removed].filter((h) => h.note).length > 1) {
      toast.error("These highlights both have notes, so they can't be merged");
      return null;
    }

    const merged: Highlight = { ...base, ...draft };
    setHighlights((prev) =>
      prev
        .filter((h) => !removeIds.includes(h.id ?? 0))
        .map((h) => (h.id === baseId ? merged : h)),
    );

    const updated = await updateHighlight(baseId, {
      color: draft.color,
      position: draft.position,
      text: draft.text,
      // Measured on the lesson as it is now, which may differ from when the
      // base highlight was saved
      blockId: draft.blockId,
      ...(draft.context && { context: draft.context }),
    });
    if (!updated.ok) {
      setHighlights((prev) => [
        ...prev.map((h) => (h.id === baseId ? base : h)),
        ...removed,
      ]);
      toast.error("Failed to save highlight");
      return null;
    }

    const deleted = await Promise.all(
      removeIds.map((id) => deleteHighlight(id)),
    );
    // Any that couldn't be deleted are still saved, so show them again
    const kept = removed.filter((_, i) => !deleted[i].ok);
    if (kept.length > 0) {
      setHighlights((prev) => [...prev, ...kept]);
      toast.error("Failed to merge highlights");
    }
    return merged;
  };

  const handleRecolorHighlight = async (
    highlightIds: number[],
    color: HighlightColor,
  ) => {
    const before = highlights.filter(
      (h) => highlightIds.includes(h.id ?? 0) && h.color !== color,
    );
    if (before.length === 0) return;
    const setColor = (id: number | undefined, next: HighlightColor) =>
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, color: next } : h)),
      );

    before.forEach((h) => setColor(h.id, color));
    const results = await Promise.all(
      before.map((h) => updateHighlight(h.id ?? 0, { color })),
    );
    before.forEach((h, i) => {
      if (!results[i].ok) setColor(h.id, h.color);
    });
    if (results.every((result) => result.ok)) {
      toast.success("Highlight saved");
    } else {
      toast.error("Failed to save highlight");
    }
  };

  const handleDeleteHighlight = async (highlightIds: number[]) => {
    const removed = highlights.filter((h) => highlightIds.includes(h.id ?? 0));
    if (removed.length === 0) return;

    const removedIds = new Set(removed.map((h) => h.id));
    setHighlights((prev) => prev.filter((h) => !removedIds.has(h.id)));
    const results = await Promise.all(
      removed.map((h) => deleteHighlight(h.id ?? 0)),
    );
    const kept = removed.filter((_, i) => !results[i].ok);
    if (kept.length === 0) {
      toast.success("Highlight removed");
    } else {
      setHighlights((prev) => [
        ...prev,
        ...kept.filter((k) => !prev.some((h) => h.id === k.id)),
      ]);
      toast.error("Failed to remove highlight");
    }
  };

  // A highlight whose text was deleted goes onto the text the reader picked,
  // keeping its colour and note
  const handleMoveHighlight = async (target: HighlightDraft) => {
    const before = highlights.find((h) => h.id === movingId);
    setMovingId(null);
    if (!before?.id) return;
    const { text, position, blockId, context } = target;
    const replace = (next: Highlight) =>
      setHighlights((prev) => prev.map((h) => (h.id === before.id ? next : h)));

    replace({ ...before, text, position, blockId, context });
    const result = await updateHighlight(before.id, {
      text,
      position,
      blockId,
      ...(context && { context }),
    });
    if (result.ok) {
      toast.success("Highlight moved");
    } else {
      replace(before);
      toast.error("Failed to move highlight");
    }
  };

  const handleCreateNote = async (notePos: number, highlight: Highlight) => {
    setExpanded(true);
    const enrollment = await getEnrollByID(String(enrollmentId), {
      fields: ["id"],
      populate: {},
    });

    if (authUser) {
      const result = await createNote(
        lesson,
        enrollment,
        notePos,
        authUser.id,
        highlight,
      );
      if (result.success) {
        setHighlights((prev) =>
          prev.map((h) => (h.id === highlight.id ? { ...h, note: {} } : h)),
        );
        toast.success("Note created");
      } else {
        toast.error("Failed to create note");
      }
    }

    onUpdate();
  };

  // Who made the droplet, under the lesson title (ODY-863)
  const byline = authorByline(droplet.authorized_users);

  if (gate === "locked" && previousLesson) {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900">Lesson Locked</h2>
          <p className="mt-2 text-slate-600">
            Complete {previousLesson.name} to unlock this content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={lessonContentRef} className="w-full pt-6 pb-8">
      {(enrollmentId || author) && (
        <HighlightDropdown
          setExpanded={setExpanded}
          expanded={expanded}
          isActive={true}
          panel={panel}
        />
      )}
      {lessonPosition && (
        <div className="mb-3">
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
            {lessonPosition.label}
          </p>
          <div
            role="progressbar"
            aria-label={lessonPosition.label}
            aria-valuemin={0}
            aria-valuemax={lessonPosition.total}
            aria-valuenow={lessonPosition.current}
            className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-[#2D7597] transition-[width] motion-reduce:transition-none"
              style={{
                width: `${(lessonPosition.current / lessonPosition.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      <h1 className="text-[2.5rem] font-bold text-slate-900 dark:text-white">
        {lesson.name}
      </h1>
      {byline && (
        <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
          By {byline}
        </p>
      )}

      {enrollmentId && !author && <HighlightHintBanner />}

      {enrollmentId && !author && (
        <DetachedHighlights
          highlights={placement?.detached ?? []}
          movingId={movingId}
          onMove={setMovingId}
          onCancelMove={() => setMovingId(null)}
          onRemove={(id) => handleDeleteHighlight([id])}
        />
      )}

      <DatasetProvider datasets={droplet.datasets ?? []}>
        <PyodideProvider>
          <HighlightLayer
            className="mt-8 space-y-2"
            highlights={placedHighlights}
            canHighlight={!!enrollmentId && !author}
            onHighlight={handleHighlight}
            onRecolorHighlight={handleRecolorHighlight}
            onDeleteHighlight={handleDeleteHighlight}
            onNote={handleCreateNote}
            onExplain={mentorAvailable ? explain : undefined}
            onMoveHighlight={
              movingId !== null ? handleMoveHighlight : undefined
            }
          >
            {displayBlocks.map((b: Block, i: number) => (
              <LessonBlockRenderer
                key={i}
                index={i}
                block={b}
                lessonId={lesson.id}
                dropletId={droplet.id}
                dropletName={droplet.name}
                lessonName={lesson.name}
                userId={authUser?.id}
              />
            ))}
          </HighlightLayer>
        </PyodideProvider>
      </DatasetProvider>
    </div>
  );
}

/**
 * The ids a block's highlights are saved under. A generic block's is its own,
 * as it always was. Classic lessons' block ids are only unique within a block
 * type, so other blocks' are made from the type and the id.
 */
const highlightIdsOf = (block: { __component: string; id: number }) => [
  blockNoteIdToNumber(`${block.__component}:${block.id}`),
];

/**
 * One block in a positioned wrapper (the highlight toolbar's home). `index` is
 * Mentor's Citation.blockIndex; empty blocks get no wrapper.
 */
export function LessonBlockRenderer({
  index,
  ...props
}: BlockProps & { index: number }) {
  const content = blockContent(props);
  return content ? (
    <div className="relative" data-lesson-block={index}>
      {content}
    </div>
  ) : null;
}

type BlockProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any;
  lessonId: number;
  dropletId: number;
  dropletName?: string;
  lessonName: string;
  userId?: number;
};

function blockContent({
  block,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
}: BlockProps) {
  switch (block.__component) {
    case "droplets.generic":
      return <GenericBlockRenderer block={block} />;

    case "droplets.video":
      return (
        <div className="mx-auto md:-mx-8">
          <iframe
            width="100%"
            height="400"
            src={block.url}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded YouTube video"
            className="rounded-md"
          />
        </div>
      );

    case "droplets.quiz":
      return (
        <QuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.open-ended-quiz":
      return (
        <OpenEndedQuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.callout":
      return (
        <CalloutSurface
          type={block.type}
          color={block.color}
          iconEnabled={block.iconEnabled}
        >
          {/* As HTML rather than BlocksRenderer: highlights change its DOM,
              which React mustn't own */}
          <HighlightableHtml
            ids={highlightIdsOf(block)}
            html={DOMPurify.sanitize(blocksToHtml(block.content))}
            className="prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit prose-li:marker:text-slate-700 max-w-none justify-start text-slate-900"
          />
        </CalloutSurface>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="relative w-full rounded-md border border-slate-200 p-4 dark:border-slate-500">
          <CollapsibleTrigger
            data-mentor-expand
            className="inline-flex flex-row items-center gap-2 font-bold text-sky-600"
          >
            {block.title}
            <ArrowDownFromLineIcon className="h-4 w-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 border-t border-t-slate-200 pt-3 dark:border-slate-500">
            <HighlightableHtml
              ids={highlightIdsOf(block)}
              html={DOMPurify.sanitize(block.content)}
              className="prose prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit max-w-none dark:text-slate-300"
            />
          </CollapsibleContent>
        </Collapsible>
      );

    case "droplets.code-block":
      if (block.isNotebook) {
        return (
          <NotebookCodeViewer
            code={block.code}
            language={block.language}
            editable={block.editable}
            testCode={block.testCode}
          />
        );
      }
      return (
        <CodeBlockViewer
          language={block.language}
          code={block.code}
          editable={block.editable}
          runnable={block.runnable}
          highlightIds={highlightIdsOf(block)}
        />
      );

    case "droplets.sandpack-block":
      return (
        <SandpackViewer
          template={block.template}
          files={parseSandpackFiles(block.files)}
          showPreview={block.showPreview}
          editable={block.editable}
          description={block.description}
          lockedFiles={block.lockedFiles}
        />
      );

    default:
      return null;
  }
}
