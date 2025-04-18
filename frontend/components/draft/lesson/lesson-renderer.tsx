"use client";

import { Lesson, OpenEndedQuizQuestion } from "@/types";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { updateLesson, deleteLesson } from "@/lib/actions";
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

export type Block = QuizBlock | OpenEndedQuizBlock;

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
    async (blocks: Block[]) => {
      const response = await updateLesson(lesson.id, { blocks });

      if (!response || response.error || !response.ok) {
        return;
      }
    },
    [lesson.id],
  );

  const updateBlocksBackendReload = useCallback(
    async (blocks: Block[]) => {
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

  const regenerateSlug = useCallback(
    async (name: string) => {
      const response = await updateLesson(
        lesson.id,
        { name },
        { regenerateSlug: true },
      );
      if (response && !response.error) {
        const slug = response.data.attributes.slug;
        router.replace(`/draft/d/${dropletSlug}/${slug}`);
      }
    },
    [lesson.id, dropletSlug, router],
  );

  const setBlock = useCallback((index: number) => {
    return (block: Partial<Block>) => {
      setBlocks((prevBlocks) =>
        prevBlocks.map((b, i) => {
          if (i !== index) return b;
          if (b.__component === "droplets.quiz" && "questions" in block) {
            return { ...b, ...block } as QuizBlock;
          }
          if (
            b.__component === "droplets.open_ended_quiz" &&
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
    // const dropletId = (await getDropletBySlug(dropletSlug)).id
    // const response = await deleteLesson(lesson.id, true, dropletId);
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

  return (
    <>
      <div className="flex flex-col justify-start items-center border border-slate-200 dark:border-slate-500 rounded-md pt-4 px-4 pb-7 mb-5">
        <LessonNameInput
          className="w-[700px] max-w-2xl mb-3"
          initialContent={`<h1>${name}</h1>`}
          updateContent={(content: string) => {
            const textContent = htmlToText(content);
            setName(textContent);
            debouncedNameUpdate(textContent);
          }}
        />
        <div className="flex flex-row items-center justify-center space-x-10">
          <Button variant="outline" onClick={() => regenerateSlug(name)}>
            Regenerate URL Slug
          </Button>
          <DeleteLessonButton
            deleteLesson={deleteLessonBackend}
            dropletSlug={dropletSlug}
          />
        </div>
      </div>

      <div className="space-y-4 w-full flex flex-col items-center justify-center">
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
