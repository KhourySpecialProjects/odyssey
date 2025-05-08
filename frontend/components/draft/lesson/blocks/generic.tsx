"use client";
import { revalidateLesson } from "@/lib/actions";
import { GripVertical, Trash2Icon } from "lucide-react";
import { GenericBlockInput } from "@/components/ui/tiptap/generic-block-input";

export type GenericBlock = {
  __component: "droplets.generic";
  id: number;
  content: string;
};

export function GenericEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: GenericBlock;
  updateBlock: (block: GenericBlock) => void;
  deleteBlock: () => void;
}) {
  const handleChange = (content: string) => {
    updateBlock({
      id: block.id,
      __component: "droplets.generic",
      content: content,
    });
  };

  return (
    <div className="flex flex-row items-center ">
      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 z-10">
        <GripVertical size={20} />
      </div>
      <div className="w-full max-w-2xl rounded-md border border-slate-200 dark:border-slate-500 p-4 hover:shadow-md">
        <div className="w-full flex flex-row mb-4 justify-between items-center">
          <h2 className="text-lg">Text Block</h2>
          <Trash2Icon
            className="cursor-pointer text-red-600 hover:text-red-700"
            onClick={deleteBlock}
            data-testid="delete-block"
          />
        </div>
        <GenericBlockInput
          revalidate={revalidateLesson}
          initialContent={block.content}
          updateContent={handleChange}
        />
      </div>
    </div>
  );
}
