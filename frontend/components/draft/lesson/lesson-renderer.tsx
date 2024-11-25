"use client";

import { Lesson } from "@/types";
import TipTap from "@/components/ui/tiptap";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "./blocks/callout";
import { GenericEditor } from "./blocks/generic";
import { AddBlock } from "./add-block";
import { useState, useCallback, useEffect } from "react";
import { debounce } from "lodash";
import { updateLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { htmlToText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteLessonButton } from "./delete-lesson";
import { deleteLesson } from "@/lib/actions";

export function LessonRenderer({
  lesson,
  dropletSlug,
}: {
  lesson: Lesson;
  dropletSlug: string;
}) {
  const router = useRouter();

  const [blocks, setBlocks] = useState(lesson.blocks);
  const [name, setName] = useState(lesson.name);
  console.log(blocks);

  const setBlock = useCallback(
    (index: number) => {
      return (block: any) => {
        setBlocks((prevBlocks) =>
          prevBlocks.map((b, i) => (i === index ? { ...b, ...block } : b))
        );
      };
    },
    [] // Add blocks as a dependency
  );

  const deleteBlock = useCallback(
    (index: number) => {
      return () => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 1);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks]
  );

  const addBlock = useCallback(
    (index: number) => {
      return (block: any) => {
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 0, block);
        updateBlocksBackendReload(updatedBlocks);
      };
    },
    [blocks]
  );

  useEffect(() => {
    debounceUpdate(blocks);
  }, [blocks]);

  useEffect(() => {
    setBlocks(lesson.blocks);
  }, [lesson]);

  const updateBlocksBackend = async (blocks: any) => {
    console.log(blocks);
    const response = await updateLesson(lesson.id, { blocks: blocks });
    console.log(response);
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
      { regenerateSlug: true }
    );
    if (response && !response.error) {
      const slug = response.data.attributes.slug;
      router.replace("/draft/d/" + dropletSlug + "/" + slug);
    }
  };

  const updateBlocksBackendReload = async (blocks: any) => {
    console.log(blocks);
    const response = await updateLesson(
      lesson.id,
      { blocks: blocks },
      { reload: true }
    );
    console.log(response);
  };

  const deleteLessonBackend = async () => {
    const response = await deleteLesson(lesson.id);
    console.log("helllloooo");
    console.log(response);
    if (response && !response.error) {
      router.replace("/draft/d/" + dropletSlug);
    }
  };

  const debounceUpdate = useCallback(
    debounce(updateBlocksBackend, 1000, { maxWait: 3000 }),
    []
  );
  const debouncedNameUpdate = useCallback(
    debounce(updateNameBackend, 1000),
    []
  );

  return (
    <>
      <div className="flex flex-col justify-center items-center border border-slate-200 rounded-md pt-4 px-4 pb-7 mb-5">
        <TipTap
          className="w-[700px] max-w-2xl mb-3"
          variant="lesson-name"
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
          <DeleteLessonButton deleteLesson={deleteLessonBackend} />
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
