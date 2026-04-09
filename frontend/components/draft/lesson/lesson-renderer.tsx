"use client";

import { Lesson, OpenEndedQuizQuestion } from "@/types";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { cn, htmlToText } from "@/lib/utils";
import { IconPencil, IconLink } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
import { deleteLesson, updateLesson } from "@/lib/requests/lesson";
import AddLessonBlock from "./add-tools";
import { BlockNoteEditor } from "./blocknote-editor";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import { DatasetProvider } from "@/lib/contexts/dataset-context";
import { PyodideProvider } from "@/lib/pyodide/pyodide-context";
import type { Dataset } from "@/types";
import { useEditingLock } from "@/hooks/useEditingLock";
import { IconLock } from "@tabler/icons-react";

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
  datasets?: Dataset[];
}

export function LessonRenderer({
  lesson,
  dropletSlug,
  datasets = [],
}: LessonRendererProps) {
  const router = useRouter();
  const {
    isOwnLock,
    lockedBy,
    isLoading: lockLoading,
    error: lockError,
  } = useEditingLock(lesson.id);
  const isReadOnly = lockLoading || !isOwnLock;

  const [blocks, setBlocks] = useState<Block[]>(lesson.blocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<Block[]>(
    lesson.blocks,
  );
  const lastSavedBlocksRef = useRef<Block[]>(lastSavedBlocks);
  const [name, setName] = useState(lesson.name);
  const [isEditingName, setIsEditingName] = useState(false);

  // Check if lesson is truly new (empty from props and no blocksV2)
  const isLessonEmpty =
    (lesson.blocks?.length === 0 || !lesson.blocks) && !lesson.blocksV2;

  const [editorVersion, setEditorVersion] = useState<"v1" | "v2">(
    lesson.blocksVersion || "v1",
  );

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
      isNew &&
      (!lesson.blocksVersion || lesson.blocksVersion === "v1") &&
      !hasSetVersionRef.current
    ) {
      hasSetVersionRef.current = true;
      setEditorVersion("v2");
      updateLesson(lesson.id, {
        blocksVersion: "v2",
      }).catch(() => {
        // Ignore errors - lesson might not be fully created yet
      });
    }
  }, [lesson.blocks, lesson.blocksV2, lesson.blocksVersion, lesson.id]);

  const updateBlocksBackend = useCallback(
    async (blocks: Block[]) => {
      const response = await updateLesson(lesson.id, {
        blocks: blocks as unknown as BaseBlock[],
      });

      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id],
  );

  const updateBlocksV2Backend = useCallback(
    async (blocksV2: unknown) => {
      const response = await updateLesson(lesson.id, {
        blocksV2,
        blocksVersion: "v2",
      });

      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id],
  );

  const debounceUpdateV2 = useMemo(
    () => debounce(updateBlocksV2Backend, 1000, { maxWait: 3000 }),
    [updateBlocksV2Backend],
  );

  const updateBlocksBackendReload = useCallback(
    async (blocks: Block[]) => {
      await updateLesson(
        lesson.id,
        { blocks: blocks as unknown as BaseBlock[] },
        { reload: true },
      );
    },
    [lesson.id],
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
    () => debounce(updateBlocksBackend, 1000, { maxWait: 3000 }),
    [updateBlocksBackend],
  );

  useEffect(() => {
    if (editorVersion !== "v1") return;
    debounceUpdate(blocks);
    return () => {
      debounceUpdate.cancel();
    };
  }, [blocks, debounceUpdate, editorVersion]);

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
      if (response && !response.error) {
        const slug = response.data.attributes.slug;
        router.replace(`/draft/d/${dropletSlug}/${slug}`);
      }
    },
    [lesson.id, dropletSlug, router],
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
    if (response.ok && !response.error) {
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
    if (response && !response.error) {
      router.replace(`/draft/d/${dropletSlug}`);
      return;
    }
  }, [lesson.id, dropletSlug, router]);

  const debouncedNameUpdate = useMemo(
    () => debounce(updateNameBackend, 1000),
    [updateNameBackend],
  );

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

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState("");

  return (
    <>
      {isReadOnly && lockedBy && (
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
      {isReadOnly && !lockedBy && lockError && (
        <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <IconLock className="h-4 w-4 shrink-0" />
          <span>Unable to acquire editing lock. {lockError}</span>
        </div>
      )}
      {lockLoading && (
        <div className="mx-auto mb-4 max-w-2xl px-4 py-3 text-center text-sm text-slate-500">
          Checking editing access...
        </div>
      )}
      <div className="mb-2 flex flex-col items-start justify-start rounded-md px-10 pt-6 pb-1 md:px-40">
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
      </div>

      {isPopupOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Enter New URL Slug
            </h3>
            <input
              type="text"
              value={newSlugInput}
              onChange={(e) => setNewSlugInput(e.target.value)}
              placeholder="e.g., my-new-url-slug"
              className="mb-4 w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            />
            <div className="flex justify-end space-x-2">
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
            </div>
          </div>
        </div>
      )}

      {!isReadOnly && shouldShowEditorToggle && (
        <div className="mb-4 px-10 md:px-40">
          <div className="inline-flex rounded-lg border border-[#D0D5DD] bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800">
            <button
              onClick={async () => {
                if (editorVersion === "v1") return;
                hasSetVersionRef.current = true;
                debounceUpdateV2.flush();
                await updateLesson(lesson.id, {
                  blocksVersion: "v1",
                  blocksV2: null,
                });
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
                hasSetVersionRef.current = true;
                debounceUpdateV2.flush();
                await updateLesson(lesson.id, {
                  blocksVersion: "v2",
                  blocksV2: null,
                });
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

      {editorVersion === "v1" ? (
        <>
          <AddLessonBlock onAddBlock={handleAddTool} />
          <div className="w-full px-10 md:px-40">
            <BlockList
              blocks={blocks}
              onReorder={handleReorderSource}
              setBlock={setBlock}
              deleteBlock={deleteBlock}
            />
          </div>
        </>
      ) : (
        <div className="mt-8 w-full px-10 md:px-40">
          <div className="w-full min-w-[300px] md:min-w-[700px]">
            <p className="mb-4 text-base text-slate-600 dark:text-slate-300">
              Changes saved automatically
            </p>
            <DatasetProvider datasets={datasets}>
              <PyodideProvider>
                <BlockNoteEditor
                  key={`editor-${lesson.id}`}
                  initialContent={
                    lesson.blocksV2 as unknown as BlockNoteBlock[]
                  }
                  onChange={isReadOnly ? () => {} : debounceUpdateV2}
                  editable={!isReadOnly}
                />
              </PyodideProvider>
            </DatasetProvider>
          </div>
        </div>
      )}
    </>
  );
}
