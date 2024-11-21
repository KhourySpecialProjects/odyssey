"use client";
import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { updateLesson, revalidateLesson } from "@/lib/actions";
import TipTap from "@/components/ui/tiptap/tiptap";
import { Trash2Icon } from "lucide-react";

export function GenericEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: any;
  updateBlock: (block: any) => void;
  deleteBlock: () => void;
}) {
  //const [blockState, setBlockState] = useState(block);

  const handleChange = (content: string) => {
    updateBlock({
      id: block.id,
      __component: "droplets.generic",
      content: content,
    });
  };

  return (
    <div className="w-full rounded-md border border-slate-200 p-4 hover:shadow-md">
      <div className="w-full flex flex-row  mb-4 justify-between items-center">
        <h2 className="text-lg">Generic Rich Text Block</h2>
        <Trash2Icon
          className="cursor-pointer text-red-600 hover:text-red-700"
          onClick={deleteBlock}
        />
      </div>
      <TipTap
        revalidate={revalidateLesson}
        variant="lesson-generic"
        initialContent={block.content}
        updateContent={handleChange}
      />
    </div>
  );
}
