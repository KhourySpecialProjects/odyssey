"use client";

import { Lesson } from "@/types";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "./blocks/callout";
import { GenericEditor } from "./blocks/generic";
import { AddBlock } from "./add-block";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { updateLesson, deleteLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { htmlToText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteLessonButton } from "./delete-lesson";
import { useTransition } from "react";
import { useMemo } from "react";
import { LessonNameInput } from "@/components/ui/tiptap/lesson-name-input";
import { QuizEditor } from "./blocks/quiz";
import { QuizQuestion } from "@/types";

interface Block {
  __component: string;
  content: string;
  id?: number;
  title?: string;
  type?: string;
  label?: string;
  url?: string;
  questions?: QuizQuestion[];
  color: string;
}

interface LessonRendererProps {
  lesson: Lesson;
  dropletSlug: string;
}

export function LessonRenderer({ lesson, dropletSlug }: LessonRendererProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [blocks, setBlocks] = useState<Block[]>(lesson.blocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<Block[]>(
    lesson.blocks,
  );
  const lastSavedBlocksRef = useRef<Block[]>(lastSavedBlocks);
  const [name, setName] = useState(lesson.name);

  // Memoized update functions
  const updateBlocksBackend = useCallback(
    async (blocks: Block[]) => {
      const response = await updateLesson(lesson.id, { blocks });

      if (!response || response.error || !response.ok) {
        console.log("Error updating Lesson");
        return;
      }
    },
    [lesson.id],
  );

  const updateBlocksBackendReload = useCallback(
    async (blocks: Block[]) => {
      await updateLesson(lesson.id, { blocks }, { reload: true });
      console.log("Updated Blocks while reloading");
    },
    [lesson.id],
  );

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

  const deleteLessonBackend = useCallback(async () => {
    const response = await deleteLesson(lesson.id);
    if (response && !response.error) {
      router.replace(`/draft/d/${dropletSlug}`);
      console.log("Deleted Lesson");
      return;
    }
    console.log("Failed to delete lesson");
  }, [lesson.id, dropletSlug, router]);

  // Block manipulation functions
  const setBlock = useCallback((index: number) => {
    return (block: Partial<Block>) => {
      setBlocks((prevBlocks) =>
        prevBlocks.map((b, i) => (i === index ? { ...b, ...block } : b)),
      );
    };
  }, []);

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

  const addBlock = useCallback(
    (index: number) => {
      return (block: Block) => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 0, block);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks, updateBlocksBackendReload],
  );

  // Debounced updates
  const debounceUpdate = useMemo(
    () => debounce(updateBlocksBackend, 1000, { maxWait: 3000 }),
    [updateBlocksBackend],
  );

  const debouncedNameUpdate = useMemo(
    () => debounce(updateNameBackend, 1000),
    [updateNameBackend],
  );

  // Effects
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

  const renderBlock = useCallback(
    (block: Block, index: number) => {
      const props = {
        block,
        updateBlock: setBlock(index),
        deleteBlock: deleteBlock(index),
      };

      switch (block.__component) {
        case "droplets.generic":
          return <GenericEditor {...props} />;
        case "droplets.expandable":
          return <ExpandableEditor {...props} />;
        case "droplets.video":
          return <VideoEditor {...props} />;
        case "droplets.callout":
          return <CalloutEditor {...props} />;
        case "droplets.quiz":
          return (
            <QuizEditor
              block={{
                ...props.block,
                questions: props.block.questions || [],
              }}
              updateBlock={props.updateBlock}
              deleteBlock={props.deleteBlock}
            />
          );
        default:
          return null;
      }
    },
    [setBlock, deleteBlock],
  );

  return (
    <>
      <div className="flex flex-col justify-center items-center border border-slate-200 rounded-md pt-4 px-4 pb-7 mb-5">
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
        <AddBlock add={addBlock(0)} />
        {blocks.map((block, index) => (
          <div
            key={`${block.__component}-${block.id}`}
            className={`w-full flex flex-col items-center justify-center max-w-2xl space-y-4 `}
          >
            {renderBlock(block, index)}
            <AddBlock add={addBlock(index + 1)} />
          </div>
        ))}
      </div>
    </>
  );
}
