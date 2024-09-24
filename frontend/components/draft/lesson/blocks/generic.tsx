"use client";
import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { updateLesson, revalidateLesson } from "@/lib/actions";
import TipTap from "@/components/ui/tiptap";

export function GenericEditor({
  blocks,
  id,
  lessonId,
}: {
  blocks: any;
  id: number;
  lessonId: number;
}) {
  const block = blocks.find((b: any) => b.id === id);
  const [blockState, setBlockState] = useState(block);

  const updateBackend = async (updatedBlocks: any) => {
    const response = await updateLesson(
      lessonId,
      { blocks: updatedBlocks },
      false,
    );
    console.log(response);
  };

  const debounceUpdate = useCallback(debounce(updateBackend, 1000), []);

  const handleChange = (content: string) => {
    const updatedBlocks = blocks.map((b: any) => {
      if (b.id === id) {
        return {
          __component: "droplets.generic",
          content: content,
        };
      }
      return b;
    });
    setBlockState({
      id: blockState.id,
      __component: "droplets.generic",
      content: content,
    });
    debounceUpdate(updatedBlocks);
  };

  return (
    <div className="w-full rounded-md border border-slate-200 p-4 hover:shadow-md">
      <h2 className="text-lg mb-4">Generic Rich Text Block</h2>
      <TipTap
        revalidate={revalidateLesson}
        variant="lesson-generic"
        initialContent={blockState.content}
        updateContent={handleChange}
      />
    </div>
  );
}
