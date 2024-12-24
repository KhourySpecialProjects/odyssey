"use client";

import { Lesson } from "@/types";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "./blocks/callout";
import { GenericEditor } from "./blocks/generic";
import { AddBlock } from "./add-block";
import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { updateLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { htmlToText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteLessonButton } from "./delete-lesson";
import { deleteLesson } from "@/lib/actions";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTransition } from "react";
import { LessonNameInput } from "@/components/ui/tiptap/lesson-name-input";

export function LessonRenderer({
  lesson,
  dropletSlug,
}: {
  lesson: Lesson;
  dropletSlug: string;
}) {
  const router = useRouter();

  const [blocks, setBlocks] = useState(lesson.blocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState(lesson.blocks);
  const lastSavedBlocksRef = useRef(lastSavedBlocks);
  const [name, setName] = useState(lesson.name);
  const [isPending, startTransition] = useTransition();

  const setBlock = useCallback(
    (index: number) => {
      return (block: any) => {
        setBlocks((prevBlocks) =>
          prevBlocks.map((b, i) => (i === index ? { ...b, ...block } : b)),
        );
      };
    },
    [], // Add blocks as a dependency
  );

  const deleteBlock = useCallback(
    (index: number) => {
      return () => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 1);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks],
  );

  const addBlock = useCallback(
    (index: number) => {
      return (block: any) => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 0, block);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks],
  );

  useEffect(() => {
    debounceUpdate(blocks);
  }, [blocks]);

  useEffect(() => {
    setBlocks(lesson.blocks);
    setLastSavedBlocks(lesson.blocks);
  }, [lesson]);

  useEffect(() => {
    lastSavedBlocksRef.current = lastSavedBlocks;
  }, [lastSavedBlocks]);

  const updateBlocksBackend = async (blocks: any) => {
    const response = await updateLesson(lesson.id, { blocks: blocks });

    if (!response || response.error || !response.ok) {
      console.log("Error updating Lesson");
      const updatedBlocks = lastSavedBlocksRef.current.map((block) => ({
        ...block,
      }));
      startTransition(() => {
        updateBlocksBackendReload(updatedBlocks).then((res) => {
          toast.error(
            "Failed to save lesson. Reverting to last saved version.",
          );
        });
      });
    } else {
      console.log("Updated Lesson Succesfully");
      setLastSavedBlocks(blocks);
    }
  };

  const updateNameBackend = async (name: string) => {
    const response = await updateLesson(lesson.id, { name: name });
    if (response && !response.error) {
      const slug = response.data.attributes.slug;
      router.replace("/draft/d/" + dropletSlug + "/" + slug);
    }
  };

  const regenerateSlug = async (name: string) => {
    const response = await updateLesson(
      lesson.id,
      { name: name },
      { regenerateSlug: true },
    );
    if (response && !response.error) {
      const slug = response.data.attributes.slug;
      router.replace("/draft/d/" + dropletSlug + "/" + slug);
    }
  };

  const updateBlocksBackendReload = async (blocks: any) => {
    const response = await updateLesson(
      lesson.id,
      { blocks: blocks },
      { reload: true },
    );
    console.log("Updated Blocks while reloading");
  };

  const deleteLessonBackend = async () => {
    const response = await deleteLesson(lesson.id);

    if (response && !response.error) {
      router.replace("/draft/d/" + dropletSlug);
      console.log("Deleted Lesson");
    }
    console.log("Failed to delete lesson");
  };

  const debounceUpdate = useCallback(
    debounce(updateBlocksBackend, 1000, { maxWait: 3000 }),
    [],
  );
  const debouncedNameUpdate = useCallback(
    debounce(updateNameBackend, 1000),
    [],
  );

  return (
    <>
      <div className="flex flex-col justify-center items-center border border-slate-200 rounded-md pt-4 px-4 pb-7 mb-5">
        <LessonNameInput
          className="w-[700px] max-w-2xl mb-3"
          initialContent={"<h1>" + name + "</h1>"}
          updateContent={(content: string) => {
            content = htmlToText(content);
            setName(content);
            debouncedNameUpdate(content);
            debouncedNameUpdate;
          }}
        />
        <div className="flex flex-row items-center justif-center space-x-10">
          <Button
            variant="outline"
            onClick={() => {
              regenerateSlug(name);
            }}
          >
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
        {blocks.map((block, i) => (
          <div
            key={block.__component + block.id}
            className="w-full flex flex-col items-center justify-center max-w-2xl space-y-4"
          >
            {block.__component === "droplets.generic" && (
              <GenericEditor
                block={block}
                updateBlock={setBlock(i)}
                deleteBlock={deleteBlock(i)}
              />
            )}
            {block.__component === "droplets.expandable" && (
              <ExpandableEditor
                block={block}
                updateBlock={setBlock(i)}
                deleteBlock={deleteBlock(i)}
              />
            )}
            {block.__component === "droplets.video" && (
              <VideoEditor
                block={block}
                updateBlock={setBlock(i)}
                deleteBlock={deleteBlock(i)}
              />
            )}
            {block.__component === "droplets.callout" && (
              <CalloutEditor
                block={block}
                updateBlock={setBlock(i)}
                deleteBlock={deleteBlock(i)}
              />
            )}
            <AddBlock add={addBlock(i + 1)} />
          </div>
        ))}
      </div>
    </>
  );
}
