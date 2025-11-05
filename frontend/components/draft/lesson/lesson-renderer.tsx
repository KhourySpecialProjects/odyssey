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
import DraggableBlockList from "./draggable_block_list";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getDropletBySlug } from "@/lib/requests/droplet";

import { Block } from "@/types";
import { toast } from "sonner";
import { deleteLesson, updateLesson } from "@/lib/requests/lesson";
import AddLessonBlock from "./add-tools";

export interface BaseBlock {
  __component: string;
  content: string;
  id?: number;
  title?: string;
  type?: string;
  label?: string;
  url?: string;
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

  const updateBlocksBackend = useCallback(
    async (blocks: any[]) => {
      const response = await updateLesson(lesson.id, { blocks });

      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id],
  );

  const updateBlocksBackendReload = useCallback(
    async (blocks: any[]) => {
      await updateLesson(lesson.id, { blocks }, { reload: true });
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
          if (b.__component === "droplets.quiz" && "questions" in block) {
            return { ...b, ...block } as QuizBlock;
          }
          if (
            b.__component === "droplets.open-ended-quiz" &&
            "questions" in block
          ) {
            return { ...b, ...block } as OpenEndedQuizBlock;
          }
          return { ...b, ...block } as Block;
        }),
      );
    };
  }, []);

  const deleteLessonBackend = useCallback(async () => {
    const response = await getDropletBySlug(dropletSlug).then((droplet) =>
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

  const handleAddBlock = useCallback(
    (index: number, block: Block) => {
      const updatedBlocks = [...blocks];
      updatedBlocks.splice(index, 0, block);
      setBlocks(updatedBlocks);
      updateBlocksBackendReload(updatedBlocks);
    },
    [blocks, updateBlocksBackendReload],
  );

  // Add this new handler for the FAB
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
          // Map callout type names to colors
          const calloutColorMap: Record<string, string> = {
            Warning: "bg-red-300",
            Question: "bg-blue-300",
            Important: "bg-orange-300",
            Definition: "bg-green-300",
            Information: "bg-purple-300",
            Caution: "bg-amber-300",
            Default: "bg-sky-50 dark:bg-sky-200",
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
              "bg-sky-50 dark:bg-sky-200",
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

      // Add the block at the end of the list
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
    setBlocks(lesson.blocks);
    setLastSavedBlocks(lesson.blocks);
  }, [lesson]);

  useEffect(() => {
    lastSavedBlocksRef.current = lastSavedBlocks;
  }, [lastSavedBlocks]);

  const handleReorderSource = (fromIndex: number, toIndex: number) => {
    setBlocks((current) => {
      const newItems = [...current];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  };

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState("");

  return (
    <>
      <div className="mb-5 flex flex-col items-center justify-start rounded-md border border-slate-200 px-4 pt-4 pb-7 dark:border-slate-500">
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
          <DeleteLessonButton
            deleteLesson={deleteLessonBackend}
            dropletSlug={dropletSlug}
          />
        </div>
      </div>

      <AddLessonBlock onAddBlock={handleAddTool} />
      <div className="flex w-full flex-col items-center justify-center space-y-4">
        <DndProvider backend={HTML5Backend}>
          <div className="w-full max-w-2xl">
            <DraggableBlockList
              blocks={blocks}
              onReorder={handleReorderSource}
              onAddBlock={handleAddBlock}
              setBlock={setBlock}
              deleteBlock={deleteBlock}
            />
          </div>
        </DndProvider>
      </div>
    </>
  );
}
