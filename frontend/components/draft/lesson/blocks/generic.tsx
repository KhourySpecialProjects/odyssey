"use client";
import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { updateLesson, revalidateLesson } from "@/lib/actions";
import TipTap from "@/components/ui/tiptap";

export function GenericEditor({
  block,
  updateBlock,
}: {
  block: any;
  updateBlock: (block: any) => void;
}) {
  
  //const [blockState, setBlockState] = useState(block);

  const handleChange = (content : string) => {
    updateBlock({
        __component: 'droplets.generic',
        content: content,
    })
  }

  

  return (
    <div className="w-full rounded-md border border-slate-200 p-4 hover:shadow-md">
      <h2 className="text-lg mb-4">Generic Rich Text Block</h2>
      <TipTap
        revalidate={revalidateLesson}
        variant="lesson-generic"
        initialContent={block.content}
        updateContent={handleChange}
      />
    </div>
  );
}
