"use client";

import { Lesson, OpenEndedQuizQuestion } from "@/types";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { cn, htmlToText } from "@/lib/utils";
import { IconPencil, IconLink } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteLessonButton } from "./delete-lesson";
import { useMemo } from "react";
import { LessonNameInput } from "@/components/ui/tiptap/lesson-name-input";
import { QuizQuestion } from "@/types";
import BlockList from "./block_list";
import { getDropletBySlug } from "@/lib/requests/droplet";

import { Block } from "@/types";
import type { Block as BlockNoteBlock } from "@blocknote/core";
import { toast } from "sonner";
import {
  deleteLesson,
  updateLesson,
  revalidateLesson,
  getLatestLessonContent,
} from "@/lib/requests/lesson";
import AddLessonBlock from "./add-tools";
import { BlockNoteEditor } from "./blocknote-editor";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import { DatasetProvider } from "@/lib/contexts/dataset-context";
import { PyodideProvider } from "@/lib/pyodide/pyodide-context";
import type { Dataset } from "@/types";
import { useEditingLock } from "@/hooks/useEditingLock";
import { useDropletReviewComments } from "@/components/draft/review/review-comments-context";
import {
  ReviewModeBar,
  type ReviewMode,
} from "@/components/draft/review/review-mode-bar";
import {
  blockTypes,
  blocksSpanned,
  commentCounts,
  commentMarks,
  commentsOnLesson,
  decorateMarks,
  draftMarkIn,
  numberComments,
} from "@/lib/review-comments";
import { blockNoteContent } from "@/lib/anchors/content";
import type { DrawnAnchor } from "@/lib/anchors/editor";
import { OutdatedComments } from "@/components/draft/review/outdated-comments";
import { CommentStrip } from "@/components/draft/review/comment-strip";
import {
  CommentKeyboardButton,
  CommentKeyboardProvider,
} from "@/components/draft/review/comment-keyboard";
import { CommentLayer } from "@/components/draft/review/comment-layer";
import { ClassicReviewView } from "@/components/draft/review/classic-review-view";
import type { ReviewAnchor, ReviewComment } from "@/types";

const NO_MARKS: DrawnAnchor[] = [];
import { IconLock } from "@tabler/icons-react";
import { REVIEW_FROZEN_ERROR, REVIEW_FROZEN_MESSAGE } from "@/lib/review-roles";

const NOTICE_MS = 8_000;

const REVIEW_FROZEN_TOAST =
  "This droplet is in review, so your last change wasn't saved.";

export interface BaseBlock {
  __component: string;
  content: string;
  id?: number;
  title?: string;
  type?: string;
  label?: string;
  url?: string;
  _clientId?: string;
}

export interface QuizBlock extends BaseBlock {
  questions?: QuizQuestion[];
  color: string;
}

export interface OpenEndedQuizBlock extends BaseBlock {
  questions?: OpenEndedQuizQuestion[];
}

interface LessonRendererProps {
  lesson: Lesson;
  dropletSlug: string;
  /** The draft's id, for the reviewer's comments (ODY-806) */
  dropletId?: number;
  datasets?: Dataset[];
}

export function LessonRenderer({
  lesson,
  dropletSlug,
  dropletId,
  datasets = [],
}: LessonRendererProps) {
  const router = useRouter();
  // The hook calls this after it takes a lock on a copy that may be old. It is
  // defined further down, once the state it replaces exists.
  const refreshLessonRef = useRef<() => Promise<boolean>>(async () => false);
  const refreshForLock = useCallback(() => refreshLessonRef.current(), []);
  const {
    isOwnLock,
    lockedBy,
    isLoading: lockLoading,
    error: lockError,
    inReview = false,
    isReviewer = false,
    reviewEnded = false,
    startEditing,
    stopEditing,
    markFrozen,
    isRefreshing = false,
    tookOver = false,
    tookOverFrom = null,
  } = useEditingLock(lesson.id, refreshForLock);
  const frozen = inReview && !isReviewer;
  const isReadOnly = lockLoading || !isOwnLock || frozen;

  // A reviewer comments or reads without the lock, or takes it to edit (ODY-806)
  const isReviewing = !reviewEnded && inReview && isReviewer && !lockLoading;
  const [viewMode, setViewMode] = useState<"read" | "comment">("comment");
  const reviewMode: ReviewMode = isOwnLock ? "edit" : viewMode;
  const reviewComments = useDropletReviewComments(dropletId, isReviewing);
  const lessonComments = useMemo(
    () => commentsOnLesson(reviewComments.comments, lesson.id),
    [reviewComments.comments, lesson.id],
  );
  const showCommentLayer = isReviewing && reviewMode === "comment";

  // Kept in refs so handleSaveResult stays stable and can cancel debounces
  // that are created after it.
  const markFrozenRef = useRef(markFrozen);
  markFrozenRef.current = markFrozen;
  const cancelSavesRef = useRef<() => void>(() => {});
  // Read in effect cleanups, which run after the render that set it.
  const discardSavesRef = useRef(false);
  discardSavesRef.current = frozen || reviewEnded;

  /**
   * Handles the result of every lesson write. A refused write (the droplet went
   * into review) freezes the editor, cancels pending saves, shows one info
   * toast and is never retried. Returns true when the result was that refusal.
   */
  const handleSaveResult = useCallback(
    (response: { error?: unknown } | null | undefined) => {
      if (response?.error !== REVIEW_FROZEN_ERROR) return false;
      markFrozenRef.current?.();
      cancelSavesRef.current();
      toast.info(REVIEW_FROZEN_TOAST, { id: "review-frozen" });
      return true;
    },
    [],
  );

  const [blocks, setBlocks] = useState<Block[]>(lesson.blocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<Block[]>(
    lesson.blocks,
  );
  const lastSavedBlocksRef = useRef<Block[]>(lastSavedBlocks);
  const [name, setName] = useState(lesson.name);
  const [isEditingName, setIsEditingName] = useState(false);

  const [editorVersion, setEditorVersion] = useState<"v1" | "v2">(
    lesson.blocksVersion || "v1",
  );
  // BlockNote and the classic blocks mount once per content version: a refresh
  // after a lock takeover bumps it, which remounts them on the latest content.
  const [blocksV2, setBlocksV2] = useState<unknown>(lesson.blocksV2);
  const [contentVersion, setContentVersion] = useState(0);

  // Each comment found in the current content, or listed as outdated
  const anchorContent = useMemo(
    () => ({
      blocks: blockNoteContent(
        Array.isArray(blocksV2) ? (blocksV2 as BlockNoteBlock[]) : [],
      ),
    }),
    [blocksV2],
  );
  const marks = useMemo(
    () =>
      commentMarks(lessonComments, anchorContent, reviewComments.review?.state),
    [lessonComments, anchorContent, reviewComments.review?.state],
  );
  // The text a comment is being written for stays marked while the reviewer
  // types, and hovering a tag or a mark lights the mark
  const [draftAnchor, setDraftAnchor] = useState<ReviewAnchor | null>(null);
  const [litMarkId, setLitMarkId] = useState<string | null>(null);
  const drawnMarks = useMemo(
    () =>
      decorateMarks(
        marks.drawn,
        litMarkId,
        draftMarkIn(anchorContent, draftAnchor),
      ),
    [marks.drawn, litMarkId, draftAnchor, anchorContent],
  );
  const commentNumbers = useMemo(
    () => numberComments(lessonComments),
    [lessonComments],
  );
  // A Classic lesson finds its outdated comments once its text is on the page
  const [classicOutdated, setClassicOutdated] = useState<ReviewComment[]>([]);
  const handleClassicOutdated = useCallback((list: ReviewComment[]) => {
    setClassicOutdated((current) =>
      current.length === list.length &&
      current.every((c, i) => c.id === list[i].id)
        ? current
        : list,
    );
  }, []);
  const outdatedComments =
    editorVersion === "v2" ? marks.outdated : classicOutdated;
  const outdatedIds = useMemo(
    () => new Set(outdatedComments.map((c) => c.id)),
    [outdatedComments],
  );
  const blockTypeById = useMemo(
    () =>
      blockTypes(Array.isArray(blocksV2) ? (blocksV2 as BlockNoteBlock[]) : []),
    [blocksV2],
  );
  const blockFor = useCallback(
    (blockId: string) => {
      const text = anchorContent.blocks.find((b) => b.id === blockId)?.text;
      return text === undefined
        ? undefined
        : { type: blockTypeById.get(blockId), text };
    },
    [anchorContent, blockTypeById],
  );
  const blocksFor = useCallback(
    (anchor: ReviewAnchor) => blocksSpanned(anchorContent, anchor),
    [anchorContent],
  );
  // Comments change only while the review is open (or not opened yet)
  const canChangeComments =
    !reviewComments.review || reviewComments.review.state === "open";
  const { add: addReviewComment } = reviewComments;
  const postComment = useCallback(
    (anchor: ReviewAnchor, body: string) =>
      addReviewComment({ field: "blocks", lessonId: lesson.id, anchor, body }),
    [addReviewComment, lesson.id],
  );
  const commentLayerProps = {
    enabled: showCommentLayer,
    field: "blocks" as const,
    comments: lessonComments,
    numbers: commentNumbers,
    outdatedIds,
    blockFor,
    blocksFor,
    canChange: canChangeComments,
    onPost: postComment,
    onEdit: reviewComments.edit,
    onDelete: reviewComments.remove,
    onResolve: reviewComments.resolve,
    onDraftChange: setDraftAnchor,
    litMarkId,
    onLitChange: setLitMarkId,
  };

  // Check if the lesson is truly new. Read from state, not props: after a lock
  // takeover the props are the copy from when the page loaded.
  const isLessonEmpty = (blocks?.length === 0 || !blocks) && !blocksV2;

  // Show toggle button if:
  // 1. Lesson is truly empty (new lesson), OR
  // 2. We're in v1 mode and current blocks state is empty (all blocks deleted)
  const shouldShowEditorToggle = useMemo(() => {
    return (
      isLessonEmpty ||
      (editorVersion === "v1" && (blocks?.length === 0 || !blocks))
    );
  }, [isLessonEmpty, editorVersion, blocks]);

  const hasSetVersionRef = useRef(false);

  useEffect(() => {
    const isNew =
      (lesson.blocks?.length === 0 || !lesson.blocks) && !lesson.blocksV2;

    if (
      !isReadOnly &&
      isNew &&
      (!lesson.blocksVersion || lesson.blocksVersion === "v1") &&
      !hasSetVersionRef.current
    ) {
      hasSetVersionRef.current = true;
      setEditorVersion("v2");
      updateLesson(lesson.id, {
        blocksVersion: "v2",
      })
        .then(handleSaveResult)
        .catch(() => {
          // Ignore errors - lesson might not be fully created yet
        });
    }
  }, [
    lesson.blocks,
    lesson.blocksV2,
    lesson.blocksVersion,
    lesson.id,
    isReadOnly,
    handleSaveResult,
  ]);

  const updateBlocksBackend = useCallback(
    async (blocks: Block[]) => {
      const response = await updateLesson(
        lesson.id,
        { blocks: blocks as unknown as BaseBlock[] },
        { skipRevalidation: true },
      );

      if (handleSaveResult(response)) return;
      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id, handleSaveResult],
  );

  const updateBlocksV2Backend = useCallback(
    async (blocksV2: unknown) => {
      const response = await updateLesson(
        lesson.id,
        { blocksV2, blocksVersion: "v2" },
        { skipRevalidation: true },
      );

      if (handleSaveResult(response)) return;
      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id, handleSaveResult],
  );

  const debounceUpdateV2 = useMemo(
    () => debounce(updateBlocksV2Backend, 1500, { maxWait: 4000 }),
    [updateBlocksV2Backend],
  );

  const updateBlocksBackendReload = useCallback(
    async (blocks: Block[]) => {
      const response = await updateLesson(
        lesson.id,
        { blocks: blocks as unknown as BaseBlock[] },
        { reload: true },
      );
      handleSaveResult(response);
    },
    [lesson.id, handleSaveResult],
  );

  const deleteBlock = useCallback(
    (index: number) => {
      return () => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 1);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks, updateBlocksBackendReload],
  );

  const debounceUpdate = useMemo(
    () => debounce(updateBlocksBackend, 1500, { maxWait: 4000 }),
    [updateBlocksBackend],
  );

  // Revalidate lesson cache once when leaving the editor,
  // so navigating back serves fresh data from Strapi.
  useEffect(() => {
    return () => {
      revalidateLesson().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (editorVersion !== "v1" || isReadOnly) return;
    debounceUpdate(blocks);
    return () => {
      // Once the tab is frozen or the review is over, the server would refuse
      // the pending save, so drop it instead of flushing it.
      if (discardSavesRef.current) debounceUpdate.cancel();
      else debounceUpdate.flush();
    };
  }, [blocks, debounceUpdate, editorVersion, isReadOnly]);

  useEffect(() => {
    setBlocks(lesson.blocks);
    setLastSavedBlocks(lesson.blocks);
    if (lesson.blocksVersion) {
      hasSetVersionRef.current = true;
    }
  }, [lesson]);

  useEffect(() => {
    lastSavedBlocksRef.current = lastSavedBlocks;
  }, [lastSavedBlocks]);

  // Listen for flush-save requests from sidebar Preview button
  useEffect(() => {
    const handleFlushSave = async () => {
      try {
        if (editorVersion === "v2") {
          await debounceUpdateV2.flush();
        } else {
          await debounceUpdate.flush();
        }
      } finally {
        window.dispatchEvent(new CustomEvent("flush-save-complete"));
      }
    };

    window.addEventListener("flush-save-request", handleFlushSave);
    return () => {
      window.removeEventListener("flush-save-request", handleFlushSave);
    };
  }, [editorVersion, debounceUpdateV2, debounceUpdate]);

  const updateNameBackend = useCallback(
    async (name: string) => {
      const response = await updateLesson(lesson.id, { name });
      if (handleSaveResult(response)) return;
      if (response && !response.error) {
        const slug = response.data.attributes.slug;
        router.replace(`/draft/d/${dropletSlug}/${slug}`);
      }
    },
    [lesson.id, dropletSlug, router, handleSaveResult],
  );

  const handleRegenerateSlug = async () => {
    if (newSlugInput.trim() === "") {
      console.error("New slug cannot be empty");
      return;
    }
    const response = await updateLesson(
      lesson.id,
      { name, slug: newSlugInput.trim() },
      { regenerateSlug: false },
    );
    if (handleSaveResult(response)) {
      setIsPopupOpen(false);
    } else if (response.ok && !response.error) {
      router.replace(
        `/draft/d/${dropletSlug}/${response.data.attributes.slug}`,
      );
      setIsPopupOpen(false);
    } else {
      toast.error("A lesson with that slug already exists");
      setIsPopupOpen(false);
    }
  };

  const setBlock = useCallback((index: number) => {
    return (block: Partial<Block>) => {
      setBlocks((prevBlocks) =>
        prevBlocks.map((b, i) => {
          if (i !== index) return b;
          return { ...b, ...block } as Block;
        }),
      );
    };
  }, []);

  const deleteLessonBackend = useCallback(async () => {
    const response = await getDropletBySlug(dropletSlug, {
      fields: ["id"],
      populate: {},
    }).then(() => deleteLesson(lesson.id, true));
    if (handleSaveResult(response)) return;
    if (response && !response.error) {
      router.replace(`/draft/d/${dropletSlug}`);
      return;
    }
  }, [lesson.id, dropletSlug, router, handleSaveResult]);

  const debouncedNameUpdate = useMemo(
    () => debounce(updateNameBackend, 1000),
    [updateNameBackend],
  );
  cancelSavesRef.current = () => {
    debounceUpdate.cancel();
    debounceUpdateV2.cancel();
    debouncedNameUpdate.cancel();
  };

  // The takeover notice shows for a few seconds after the tab turns editable.
  const [noticeVisible, setNoticeVisible] = useState(false);
  const takeoverNoticeDue = isOwnLock && tookOver && !inReview;
  useEffect(() => {
    if (!takeoverNoticeDue) {
      setNoticeVisible(false);
      return;
    }
    setNoticeVisible(true);
    const timer = setTimeout(() => setNoticeVisible(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [takeoverNoticeDue, tookOverFrom]);
  const showTakeoverNotice = takeoverNoticeDue && noticeVisible;
  const liveMessage = isRefreshing
    ? "Loading the latest version..."
    : showTakeoverNotice
      ? tookOverFrom
        ? `${tookOverFrom.firstName} ${tookOverFrom.lastName} finished editing. You're now editing the latest version.`
        : "You're now editing the latest version."
      : "";

  // Loads the latest saved content before the tab turns editable. Pending
  // saves are dropped first: they hold the old copy. The editor stays
  // read-only (no onChange, no autosave) until this resolves, and BlockNote's
  // onChange only fires on edits, so remounting unchanged content saves nothing.
  refreshLessonRef.current = async () => {
    cancelSavesRef.current();
    const response = await getLatestLessonContent(lesson.id);
    // A refusal because the droplet went into review freezes the tab at once.
    if (handleSaveResult(response)) return false;
    if (!response?.ok || !response.data) return false;
    const fresh = response.data;
    setIsEditingName(false);
    const freshBlocks = (fresh.blocks ?? []) as Block[];
    hasSetVersionRef.current = true;
    setBlocks(freshBlocks);
    setLastSavedBlocks(freshBlocks);
    setName(fresh.name);
    setEditorVersion(fresh.blocksVersion === "v2" ? "v2" : "v1");
    setBlocksV2(fresh.blocksV2);
    setContentVersion((v) => v + 1);
    return true;
  };

  // Picked up by the poll: drop every pending save rather than send it.
  useEffect(() => {
    if (frozen || reviewEnded) cancelSavesRef.current();
  }, [frozen, reviewEnded]);

  // Stop editing: send what is pending, wait for it, then release the lock.
  const handleStopEditing = async () => {
    await Promise.all([
      debounceUpdate.flush(),
      debounceUpdateV2.flush(),
      debouncedNameUpdate.flush(),
    ]);
    await stopEditing();
  };

  const handleAddTool = useCallback(
    (blockType: string, calloutType?: string) => {
      let newBlock: Block;

      switch (blockType) {
        case "Text":
          newBlock = {
            __component: "droplets.generic",
            content: "",
          };
          break;
        case "Expandable":
          newBlock = {
            __component: "droplets.expandable",
            title: "",
            content: "",
          };
          break;
        case "Callout Block": {
          const calloutColorMap: Record<string, string> = {
            Warning: "bg-red-300",
            Question: "bg-blue-300",
            Important: "bg-orange-300",
            Definition: "bg-green-300",
            Information: "bg-purple-300",
            Caution: "bg-amber-300",
            Default: "bg-sky-100",
          };
          newBlock = {
            __component: "droplets.callout",
            content: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "" }],
              },
            ],
            color:
              calloutColorMap[calloutType || "Default"] ||
              "bg-sky-100 dark:bg-sky-100",
            type: "info",
          };
          break;
        }
        case "Video":
          newBlock = {
            __component: "droplets.video",
            url: "",
          };
          break;
        case "Multiple Choice Quiz":
          newBlock = {
            __component: "droplets.quiz",
            questions: [
              {
                id: Math.random(),
                content: "",
                answerOptions: [],
              },
            ],
          };
          break;
        case "Open Ended Quiz":
          newBlock = {
            __component: "droplets.open-ended-quiz",
            questions: [
              {
                id: Math.random(),
                content: "",
                correctAnswer: "",
              },
            ],
          };
          break;
        case "True/False Quiz":
          newBlock = {
            __component: "droplets.quiz",
            questions: [
              {
                id: Math.random(),
                content: "",
                answerOptions: [
                  { id: Math.random(), content: "True", isCorrect: true },
                  { id: Math.random(), content: "False", isCorrect: false },
                ],
              },
            ],
          };
          break;
        case "Slide Break":
          newBlock = {
            __component: "droplets.generic",
            content: SLIDE_BREAK_MARKER,
          };
          break;
        default:
          return;
      }

      const updatedBlocks = [...blocks, newBlock];
      setBlocks(updatedBlocks);
      updateBlocksBackendReload(updatedBlocks);
    },
    [blocks, updateBlocksBackendReload],
  );

  useEffect(() => {
    lastSavedBlocksRef.current = lastSavedBlocks;
  }, [lastSavedBlocks]);

  const handleReorderSource = (fromIndex: number, toIndex: number) => {
    const newItems = [...blocks];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);

    setBlocks(newItems);
    updateBlocksBackendReload(newItems);
  };

  // The classic blocks are inert while read-only. Set the attribute on the DOM
  // node rather than as a prop: React 18 doesn't type `inert`, and the React 19
  // runtime Next's App Router bundles treats `inert=""` as false.
  const classicBlocksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    classicBlocksRef.current?.toggleAttribute("inert", isReadOnly);
  }, [isReadOnly, editorVersion, contentVersion, showCommentLayer]);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState("");

  return (
    <CommentKeyboardProvider>
      {reviewEnded && (
        <div
          role="status"
          className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <IconLock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            The review is over. Reload to edit the latest version.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      )}
      {!reviewEnded && frozen && (
        <div
          role="status"
          className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <IconLock className="h-4 w-4 shrink-0" />
          <span>{REVIEW_FROZEN_MESSAGE}</span>
        </div>
      )}
      {isReviewing && (
        <ReviewModeBar
          mode={reviewMode}
          onModeChange={setViewMode}
          onEdit={() => startEditing()}
          onStopEditing={handleStopEditing}
          editDisabled={isRefreshing}
        />
      )}
      {isReadOnly && lockedBy && !inReview && !reviewEnded && (
        <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <IconLock className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {lockedBy.firstName} {lockedBy.lastName}
            </strong>{" "}
            is currently editing this lesson. You can view but not edit.
          </span>
        </div>
      )}
      {isReadOnly && !lockedBy && lockError && !inReview && !reviewEnded && (
        <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <IconLock className="h-4 w-4 shrink-0" />
          <span>Unable to acquire editing lock. {lockError}</span>
        </div>
      )}
      {/* Always mounted, so screen readers announce text that appears in it. */}
      <div
        role="status"
        className={cn(
          liveMessage &&
            "mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
        )}
      >
        {liveMessage && <span className="flex-1">{liveMessage}</span>}
        {showTakeoverNotice && (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Dismiss notice"
            onClick={() => setNoticeVisible(false)}
          >
            Dismiss
          </Button>
        )}
      </div>
      {lockLoading && (
        <div className="mx-auto mb-4 max-w-2xl px-4 py-3 text-center text-sm text-slate-500">
          Checking editing access...
        </div>
      )}
      <div className="mb-2 flex flex-col items-start justify-start rounded-md px-10 pt-6 pb-1 md:px-40 group-data-[review-panel=open]:md:px-12">
        {isEditingName ? (
          <div className="mb-3 w-full">
            <LessonNameInput
              className="w-full text-left"
              initialContent={`<h1>${name}</h1>`}
              updateContent={
                isReadOnly
                  ? () => {}
                  : (content: string) => {
                      const textContent = htmlToText(content);
                      setName(textContent);
                      debouncedNameUpdate(textContent);
                    }
              }
              onBlur={() => setIsEditingName(false)}
            />
          </div>
        ) : (
          <div className="mb-3 flex w-full items-center justify-between">
            <div className="inline-flex items-center gap-3">
              <h1 className="text-[2.5rem] font-bold text-slate-900 dark:text-white">
                {name}
              </h1>
              {!isReadOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="flex items-center justify-center text-[#344054] hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Edit lesson title"
                      >
                        <IconPencil className="h-5 w-5" stroke={1.8} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Edit title</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsPopupOpen(true)}
                        className="flex items-center justify-center rounded-md p-2 text-[#344054] hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Change URL"
                      >
                        <IconLink className="h-5 w-5" stroke={1.8} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change URL</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteLessonButton
                  deleteLesson={deleteLessonBackend}
                  dropletSlug={dropletSlug}
                />
              </div>
            )}
          </div>
        )}
        {showCommentLayer && (
          <CommentStrip
            {...commentCounts(lessonComments, reviewComments.review?.state)}
            isLoading={reviewComments.isLoading}
            loadError={!!reviewComments.loadError}
            blockBars={editorVersion === "v2"}
            keyboard={<CommentKeyboardButton />}
          >
            <OutdatedComments comments={outdatedComments} />
          </CommentStrip>
        )}
      </div>

      <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DialogContent className="max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Enter New URL Slug</DialogTitle>
          </DialogHeader>
          <Input
            type="text"
            value={newSlugInput}
            onChange={(e) => setNewSlugInput(e.target.value)}
            placeholder="e.g., my-new-url-slug"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPopupOpen(false)}
              className="dark:border-slate-600 dark:text-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateSlug}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isReadOnly && shouldShowEditorToggle && (
        <div className="mb-4 px-10 md:px-40 group-data-[review-panel=open]:md:px-12">
          <div className="inline-flex rounded-lg border border-[#D0D5DD] bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800">
            <button
              onClick={async () => {
                if (editorVersion === "v1") return;
                hasSetVersionRef.current = true;
                debounceUpdateV2.flush();
                const response = await updateLesson(lesson.id, {
                  blocksVersion: "v1",
                  blocksV2: null,
                });
                if (handleSaveResult(response)) return;
                if (!response?.ok || response.error) {
                  toast.error("Could not switch the editor. Please try again.");
                  return;
                }
                setEditorVersion("v1");
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                editorVersion === "v1"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              Classic
            </button>
            <button
              onClick={async () => {
                if (editorVersion === "v2") return;
                debounceUpdate.flush();
                hasSetVersionRef.current = true;
                const response = await updateLesson(lesson.id, {
                  blocksVersion: "v2",
                  blocksV2: null,
                });
                if (handleSaveResult(response)) return;
                if (!response?.ok || response.error) {
                  toast.error("Could not switch the editor. Please try again.");
                  return;
                }
                setEditorVersion("v2");
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                editorVersion === "v2"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              BlockNote
            </button>
          </div>
        </div>
      )}

      {editorVersion === "v1" && showCommentLayer ? (
        // Comment mode shows Classic blocks as one read-only text (Task 7)
        <div className="w-full px-10 md:px-40 group-data-[review-panel=open]:md:px-12">
          <CommentLayer {...commentLayerProps}>
            <ClassicReviewView
              blocks={blocks}
              comments={lessonComments}
              reviewState={reviewComments.review?.state}
              draftAnchor={draftAnchor}
              litMarkId={litMarkId}
              onOutdated={handleClassicOutdated}
            />
          </CommentLayer>
        </div>
      ) : editorVersion === "v1" ? (
        <>
          {!isReadOnly && <AddLessonBlock onAddBlock={handleAddTool} />}
          <div
            key={contentVersion}
            className="w-full px-10 md:px-40 group-data-[review-panel=open]:md:px-12"
            ref={classicBlocksRef}
          >
            <BlockList
              blocks={blocks}
              onReorder={handleReorderSource}
              setBlock={setBlock}
              deleteBlock={deleteBlock}
            />
          </div>
        </>
      ) : (
        <div className="mt-8 w-full px-10 md:px-40 group-data-[review-panel=open]:md:px-12">
          <div className="w-full min-w-[300px] md:min-w-[700px]">
            <p className="mb-4 text-right text-sm text-slate-400 italic dark:text-slate-400">
              Changes saved automatically
            </p>
            <DatasetProvider datasets={datasets}>
              <PyodideProvider>
                <CommentLayer {...commentLayerProps}>
                  <BlockNoteEditor
                    key={`editor-${lesson.id}-${contentVersion}`}
                    initialContent={blocksV2 as unknown as BlockNoteBlock[]}
                    onChange={isReadOnly ? () => {} : debounceUpdateV2}
                    editable={!isReadOnly}
                    anchors={showCommentLayer ? drawnMarks : NO_MARKS}
                  />
                </CommentLayer>
              </PyodideProvider>
            </DatasetProvider>
          </div>
        </div>
      )}
    </CommentKeyboardProvider>
  );
}
