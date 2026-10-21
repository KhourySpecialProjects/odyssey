"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  extractHeadings,
  isAuthorizedUserAdmin,
  parseSandpackFiles,
} from "@/lib/utils";
import { User, Droplet, Lesson, AuthorizedUser, Note } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./generic-block-renderer";
import { useEffect, useMemo, useRef, useState } from "react";
import { LockIcon } from "lucide-react";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { toast } from "sonner";
import { Highlight, HighlightColor } from "@/types";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from "@/lib/requests/highlights";
import { Block } from "@/types";
import { GenericBlock } from "@/components/draft/lesson/blocks/generic";
import posthog from "posthog-js";
import "katex/dist/katex.min.css";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";
import { HighlightDropdown } from "./highlight-dropdown";
import { highlightHasNote, isPendingHighlightId } from "./highlight-ids";
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
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "lessons" | "name" | "datasets">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
  /** The user's highlights on this lesson, fetched by the lesson page */
  initialHighlights: Highlight[];
  /**
   * The user's notes on this lesson, kept current by the page. When given, a
   * highlight "has a note" if one of these notes is attached to it, which
   * follows notes deleted in the notes bar.
   */
  notes?: Note[];
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
  notes,
  onUpdate,
  expanded,
  setExpanded,
}: LessonRendererProps) {
  // Move all hooks before any early returns.
  // Highlights come from the lesson page, then are changed locally at once on
  // create/update/merge/delete and rolled back if the server says no (the
  // wrapper is keyed by lesson, so this resets per lesson).
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const firedMilestones = useRef<Set<number>>(new Set());
  // Temporary ids for highlights that are still being saved. They are negative
  // so they can never collide with a server id.
  const nextTempHighlightId = useRef(-1);
  // The latest list, updated synchronously by `commitHighlights`. Handlers read
  // and roll back from here, never from the list of the render they were
  // created in, which can be stale by the time a save or delete returns.
  const highlightsRef = useRef<Highlight[]>(initialHighlights);
  // Ids whose delete is already on its way, so a repeat call is ignored.
  const deletingIds = useRef<Set<number>>(new Set());
  // The newest update started for each highlight, so a failing older update
  // doesn't roll the screen back over a newer one
  const updateSeq = useRef<Map<number, number>>(new Map());
  const startUpdate = (id: number) => {
    const seq = (updateSeq.current.get(id) ?? 0) + 1;
    updateSeq.current.set(id, seq);
    return seq;
  };
  const isLatestUpdate = (id: number, seq: number) =>
    updateSeq.current.get(id) === seq;

  const commitHighlights = (update: (prev: Highlight[]) => Highlight[]) => {
    const next = update(highlightsRef.current);
    highlightsRef.current = next;
    setHighlights(next);
  };

  // Which highlights have a note. When the notes list is given it is the
  // truth (it follows deletions made in the notes bar); otherwise the flag on
  // each highlight, which is only as fresh as the page load.
  const noteHighlightIds = useMemo(
    () =>
      notes
        ? new Set(
            notes.flatMap((n) => (n.highlight?.id ? [n.highlight.id] : [])),
          )
        : null,
    [notes],
  );
  // Notes created here that the notes list hasn't caught up with yet
  const [justNoted, setJustNoted] = useState<number[]>([]);
  useEffect(() => {
    if (!noteHighlightIds) return;
    setJustNoted((prev) => {
      const rest = prev.filter((id) => !noteHighlightIds.has(id));
      return rest.length === prev.length ? prev : rest;
    });
  }, [noteHighlightIds]);
  const hasNote = (h: Highlight) =>
    noteHighlightIds
      ? h.id !== undefined &&
        (noteHighlightIds.has(h.id) || justNoted.includes(h.id))
      : highlightHasNote(h);
  // What the blocks see: each highlight's note flag taken from `hasNote`
  const shownHighlights = highlights.map((h) =>
    hasNote(h) === highlightHasNote(h)
      ? h
      : { ...h, note: hasNote(h) ? {} : null },
  );

  const displayBlocks =
    lesson.blocksVersion === "v2" && lesson.blocksV2
      ? convertBlockNoteToV1Blocks(lesson.blocksV2)
      : lesson.blocks;

  let headings: Heading[] = [];
  displayBlocks
    .filter((b: Block) => b.__component === "droplets.generic")
    .forEach((b: Block) => {
      headings = headings.concat(extractHeadings((b as GenericBlock).content));
    });

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);
  const isNotEnrolled = !enrollmentId && !author && !isAdmin;

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

  if (isNotEnrolled) {
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

  // A save, update or delete that didn't go through. A lapsed session says so
  // (retrying would just fail again); anything else gets the generic message.
  const notifyFailure = (error: string | null | undefined, generic: string) =>
    toast.error(
      error === "unauthenticated"
        ? "Your session has expired. Sign in again to save highlights."
        : generic,
    );

  // The list above is the single source of truth: blocks draw from it, so a
  // change here shows at once. A new highlight goes in with a temporary id and
  // is swapped for the server record when the save returns, or taken out again
  // if it fails.
  const handleHighlight = async (
    highlight: Highlight,
    isWithNote?: boolean,
  ): Promise<Highlight | null> => {
    const tempId = nextTempHighlightId.current--;
    commitHighlights((prev) => [...prev, { ...highlight, id: tempId }]);

    let failure: string | null | undefined;
    const fail = () => {
      commitHighlights((prev) => prev.filter((h) => h.id !== tempId));
      notifyFailure(failure, "Failed to save highlight");
      return null;
    };

    try {
      const result = await createHighlight({
        text: highlight.text,
        position: highlight.position,
        color: highlight.color,
        blockId: highlight.blockId,
        lessonId: lesson.id,
      });
      failure = result.error;
      if (!result.ok || !result.data) return fail();

      const saved: Highlight = { ...highlight, ...result.data };
      commitHighlights((prev) =>
        prev.map((h) => (h.id === tempId ? saved : h)),
      );
      if (isWithNote !== true) {
        toast.success("Highlight saved");
      }
      return saved;
    } catch {
      return fail();
    }
  };

  // Removed from the list at once; put back if the delete fails.
  const handleDeleteHighlight = async (
    highlightId: number,
  ): Promise<boolean> => {
    // Still being saved: there is no server record to delete yet.
    if (isPendingHighlightId(highlightId)) return false;
    // Already on its way (e.g. two drawn pieces resolved to the same record)
    if (deletingIds.current.has(highlightId)) return false;
    deletingIds.current.add(highlightId);

    const removed = highlightsRef.current.find((h) => h.id === highlightId);
    commitHighlights((prev) => prev.filter((h) => h.id !== highlightId));

    let failure: string | null | undefined;
    const restore = () => {
      if (removed) {
        commitHighlights((prev) =>
          prev.some((h) => h.id === highlightId) ? prev : [...prev, removed],
        );
      }
      notifyFailure(failure, "Failed to remove highlight");
      return false;
    };

    try {
      const result = await deleteHighlight(highlightId);
      failure = result.error;
      // Already gone on the server: that is what the user asked for
      if (!result.ok && result.error === "Highlight not found") return true;
      if (!result.ok) return restore();

      toast.success("Highlight removed");
      // Its note (if it had one) is now a general note: refresh the notes
      if (removed && hasNote(removed)) onUpdate();
      return true;
    } catch {
      return restore();
    } finally {
      deletingIds.current.delete(highlightId);
    }
  };

  // Shown changed at once; put back if the update fails.
  const handleUpdateHighlight = async (
    highlightId: number,
    changes: {
      color?: HighlightColor;
      position?: { start: number; end: number };
      text?: string;
    },
  ): Promise<Highlight | null> => {
    if (isPendingHighlightId(highlightId)) return null;

    const previous = highlightsRef.current.find((h) => h.id === highlightId);
    if (!previous) return null;
    const seq = startUpdate(highlightId);
    commitHighlights((prev) =>
      prev.map((h) => (h.id === highlightId ? { ...h, ...changes } : h)),
    );

    let failure: string | null | undefined;
    const rollBack = () => {
      // Only if no newer update has started since: that one owns the screen
      if (isLatestUpdate(highlightId, seq)) {
        commitHighlights((prev) =>
          prev.map((h) => (h.id === highlightId ? previous : h)),
        );
      }
      notifyFailure(failure, "Failed to update highlight");
      return null;
    };

    try {
      const result = await updateHighlight(highlightId, changes);
      failure = result.error;
      // Gone on the server: drop it, as a delete would, rather than putting
      // back a highlight that no longer exists
      if (!result.ok && result.error === "Highlight not found") {
        commitHighlights((prev) => prev.filter((h) => h.id !== highlightId));
        return null;
      }
      if (!result.ok || !result.data) return rollBack();

      const updated: Highlight = { ...previous, ...changes, ...result.data };
      commitHighlights((prev) =>
        prev.map((h) => (h.id === highlightId ? updated : h)),
      );
      toast.success("Highlight updated");
      // A note embeds its highlight (colour, text, position): refresh the notes
      if (hasNote(previous)) onUpdate();
      return updated;
    } catch {
      return rollBack();
    }
  };

  // Merge overlapping highlights into `baseId` (ODY-153). The union shows and
  // the absorbed highlights hide at once. The server update goes first; the
  // absorbed ones are deleted only after it succeeds. If the update fails
  // everything is put back; if a delete fails that highlight comes back.
  const handleMergeHighlights = async (
    baseId: number,
    changes: {
      color: HighlightColor;
      position: { start: number; end: number };
      text: string;
    },
    removeIds: number[],
  ): Promise<Highlight | null> => {
    if (isPendingHighlightId(baseId)) return null;
    const previousBase = highlightsRef.current.find((h) => h.id === baseId);
    if (!previousBase) return null;
    // A highlight with a note is never absorbed (its note would become a
    // general note), even if the caller asked: re-checked against the latest
    // state, since a note can have been added since the block decided.
    const absorbed = highlightsRef.current.filter(
      (h) =>
        h.id !== undefined &&
        removeIds.includes(h.id) &&
        !isPendingHighlightId(h.id) &&
        !hasNote(h),
    );
    const absorbedIds = absorbed.map((h) => h.id);
    const seq = startUpdate(baseId);

    commitHighlights((prev) =>
      prev
        .filter((h) => !absorbedIds.includes(h.id))
        .map((h) => (h.id === baseId ? { ...h, ...changes } : h)),
    );

    const restore = (records: Highlight[]) =>
      commitHighlights((prev) => [
        ...prev,
        ...records.filter((r) => !prev.some((h) => h.id === r.id)),
      ]);

    let failure: string | null | undefined;
    const rollBack = () => {
      if (isLatestUpdate(baseId, seq)) {
        commitHighlights((prev) =>
          prev.map((h) => (h.id === baseId ? previousBase : h)),
        );
      }
      restore(absorbed);
      notifyFailure(failure, "Failed to update highlight");
      return null;
    };

    let updated: Highlight;
    try {
      const result = await updateHighlight(baseId, changes);
      failure = result.error;
      // The base is gone on the server: drop it, as a delete would, and bring
      // the absorbed highlights back (they were never deleted)
      if (!result.ok && result.error === "Highlight not found") {
        commitHighlights((prev) => prev.filter((h) => h.id !== baseId));
        restore(absorbed);
        return null;
      }
      if (!result.ok || !result.data) return rollBack();
      updated = { ...previousBase, ...changes, ...result.data };
    } catch {
      return rollBack();
    }
    commitHighlights((prev) =>
      prev.map((h) => (h.id === baseId ? updated : h)),
    );
    toast.success("Highlights merged");
    // The base's note embeds its highlight: refresh the notes (new position,
    // colour and text, or the badge's jump-to-text goes to the old place)
    if (hasNote(previousBase)) onUpdate();

    await Promise.all(
      absorbed.map(async (record) => {
        let failure: string | null | undefined;
        try {
          const result = await deleteHighlight(record.id as number);
          // Already gone on the server counts as deleted
          if (result.ok || result.error === "Highlight not found") return;
          failure = result.error;
        } catch {
          // fall through to the restore below
        }
        restore([record]);
        notifyFailure(failure, "Failed to remove highlight");
      }),
    );
    return updated;
  };

  const handleCreateNote = async (notePos: number, highlight: Highlight) => {
    setExpanded(true);

    // note.highlight is one-to-one: a second note would take the link from the
    // first. Take the user to the existing note instead.
    const current =
      highlightsRef.current.find((h) => h.id === highlight.id) ?? highlight;
    if (hasNote(current)) {
      toast.info("This highlight already has a note");
      return;
    }

    try {
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
          commitHighlights((prev) =>
            prev.map((h) => (h.id === highlight.id ? { ...h, note: {} } : h)),
          );
          if (highlight.id !== undefined) {
            const noted = highlight.id;
            setJustNoted((prev) => [...prev, noted]);
          }
          toast.success("Note created");
        } else {
          toast.error("Failed to create note");
        }
      }
    } catch {
      toast.error("Failed to create note");
    }

    onUpdate();
  };

  const currentLessonOrder = (droplet.lessons ?? []).find(
    (dl) => dl.id === lesson.id,
  )?.orderIndex;

  const previousLesson = (droplet.lessons ?? []).find(
    (dl) => dl.orderIndex === (currentLessonOrder as number) - 1,
  );

  const isLocked =
    previousLesson &&
    !completedLessonIds.includes(previousLesson.id) &&
    !author &&
    !(user && isAuthorizedUserAdmin(user.roles));

  if (isLocked) {
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
        />
      )}
      <h1 className="text-[2.5rem] font-bold text-slate-900 dark:text-white">
        {lesson.name}
      </h1>

      {enrollmentId && !author && <HighlightHintBanner />}

      <DatasetProvider datasets={droplet.datasets ?? []}>
        <PyodideProvider>
          <div className="mt-8 space-y-2">
            {displayBlocks.map((b: Block, i: number) => (
              <LessonBlockRenderer
                key={i}
                block={b}
                lessonId={lesson.id}
                dropletId={droplet.id}
                dropletName={droplet.name}
                lessonName={lesson.name}
                userId={authUser?.id}
                highlights={shownHighlights}
                onHighlight={handleHighlight}
                onUpdateHighlight={handleUpdateHighlight}
                onMergeHighlights={handleMergeHighlights}
                onDeleteHighlight={handleDeleteHighlight}
                onNote={handleCreateNote}
                enrollmentId={enrollmentId}
                author={author}
              />
            ))}
          </div>
        </PyodideProvider>
      </DatasetProvider>
    </div>
  );
}

function LessonBlockRenderer({
  block,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
  highlights,
  onHighlight,
  onUpdateHighlight,
  onMergeHighlights,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  author,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any;
  lessonId: number;
  dropletId: number;
  dropletName?: string;
  lessonName: string;
  userId?: number;
  highlights: Highlight[];
  onHighlight: (
    highlight: Highlight,
    isWithNote?: boolean,
  ) => Promise<Highlight | null>;
  onUpdateHighlight: (
    id: number,
    changes: {
      color?: HighlightColor;
      position?: { start: number; end: number };
      text?: string;
    },
  ) => Promise<Highlight | null>;
  onMergeHighlights: (
    baseId: number,
    changes: {
      color: HighlightColor;
      position: { start: number; end: number };
      text: string;
    },
    removeIds: number[],
  ) => Promise<Highlight | null>;
  onDeleteHighlight: (id: number) => Promise<boolean>;
  onNote: (notePos: number, highlight: Highlight) => void;
  enrollmentId: string | undefined;
  author: boolean;
}) {
  switch (block.__component) {
    case "droplets.generic":
      return (
        <GenericBlockRenderer
          block={block}
          highlights={highlights}
          onHighlight={onHighlight}
          onUpdateHighlight={onUpdateHighlight}
          onMergeHighlights={onMergeHighlights}
          onDeleteHighlight={onDeleteHighlight}
          onNote={onNote}
          enrollmentId={enrollmentId}
          author={author}
        />
      );

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
        <div
          className={`flex flex-col items-center space-y-4 rounded-md border px-6 py-6 dark:border-slate-500 ${block.color || "bg-sky-50 dark:bg-sky-800"}`}
        >
          {block?.iconEnabled && (
            <div className="">
              <CalloutIcon color={block.color || "bg-sky-300"}></CalloutIcon>
            </div>
          )}

          <div className="">
            <div className="prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit justify-left prose-li:marker:text-slate-700 mx-auto max-w-none text-black">
              <BlocksRenderer content={block.content} />
            </div>
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full rounded-md border border-slate-200 p-4 dark:border-slate-500">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="h-4 w-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 border-t border-t-slate-200 pt-3 dark:border-slate-500">
            <div
              className="prose prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit max-w-none dark:text-slate-300"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(block.content),
              }}
            ></div>
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
