"use client";

import { Lesson, OpenEndedQuizQuestion } from "@/types";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { htmlToText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
}

export function LessonRenderer({ lesson, dropletSlug }: LessonRendererProps) {
  const router = useRouter();

  const [blocks, setBlocks] = useState<Block[]>(lesson.blocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<Block[]>(
    lesson.blocks,
  );
  const lastSavedBlocksRef = useRef<Block[]>(lastSavedBlocks);
  const [name, setName] = useState(lesson.name);

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
    debounceUpdate(blocks);
    return () => {
      debounceUpdate.cancel();
    };
  }, [blocks, debounceUpdate]);

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
    const response = await getDropletBySlug(dropletSlug).then(() =>
      deleteLesson(lesson.id, true),
    );
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
    debounceUpdate(blocks);
    return () => {
      debounceUpdate.cancel();
    };
  }, [blocks, debounceUpdate]);

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
      <div className="mb-5 flex flex-col items-center justify-start rounded-md border border-slate-200 px-4 pb-7 pt-4 dark:border-slate-500">
        <LessonNameInput
          className="mb-3 w-[700px] max-w-2xl text-center"
          initialContent={`<h1>${name}</h1>`}
          updateContent={(content: string) => {
            const textContent = htmlToText(content);
            setName(textContent);
            debouncedNameUpdate(textContent);
          }}
        />
        <div className="flex flex-row items-center justify-center space-x-10">
          <Button variant="outline" onClick={() => setIsPopupOpen(true)}>
            Change URL
          </Button>
          {isPopupOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
          {shouldShowEditorToggle && (
            <Button
              variant={editorVersion === "v2" ? "default" : "outline"}
              onClick={async () => {
                const newVersion = editorVersion === "v1" ? "v2" : "v1";
                hasSetVersionRef.current = true;

                if (newVersion === "v2") {
                  debounceUpdateV2.flush();
                  await updateLesson(lesson.id, {
                    blocksVersion: "v2",
                    blocksV2: null,
                  });
                } else {
                  debounceUpdateV2.flush();
                  await updateLesson(lesson.id, {
                    blocksVersion: "v1",
                    blocksV2: null,
                  });
                }

                setEditorVersion(newVersion);
              }}
              className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 ${
                editorVersion === "v1"
                  ? "animate-border border-2 border-transparent text-slate-900 [background:linear-gradient(#fff,#fff)_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.200)_0%,theme(colors.indigo.500)_25%,theme(colors.indigo.300)_50%,theme(colors.indigo.500)_75%,theme(colors.slate.200)_100%)_border-box] dark:text-slate-50 dark:[background:linear-gradient(theme(colors.slate.950),theme(colors.slate.950))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.800/.48)_0%,theme(colors.indigo.500)_25%,theme(colors.indigo.300)_50%,theme(colors.indigo.500)_75%,theme(colors.slate.800/.48)_100%)_border-box]"
                  : "border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              } hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50`}
            >
              {editorVersion === "v1"
                ? "Use BlockNote Editor"
                : "Use Classic Editor"}
            </Button>
          )}
          <DeleteLessonButton
            deleteLesson={deleteLessonBackend}
            dropletSlug={dropletSlug}
          />
        </div>
      </div>

      {editorVersion === "v1" ? (
        <>
          <AddLessonBlock onAddBlock={handleAddTool} />
          <div className="flex w-full flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-2xl">
              <BlockList
                blocks={blocks}
                onReorder={handleReorderSource}
                setBlock={setBlock}
                deleteBlock={deleteBlock}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="mx-auto mt-8 w-full px-4">
          <div className="mx-auto w-full min-w-[300px] max-w-4xl md:min-w-[700px]">
            <p className="mb-4 text-center text-sm text-slate-500">
              BlockNote Editor - Changes saved automatically
            </p>
            <BlockNoteEditor
              key={`editor-${lesson.id}`} // Add this line - forces remount on navigation
              initialContent={lesson.blocksV2 as unknown as BlockNoteBlock[]}
              onChange={(content) => {
                debounceUpdateV2(content);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
