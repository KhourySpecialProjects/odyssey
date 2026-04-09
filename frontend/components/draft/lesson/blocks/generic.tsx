"use client";
import { Trash2Icon } from "lucide-react";
import { GenericBlockInput } from "@/components/ui/tiptap/generic-block-input";
import { revalidateLesson } from "@/lib/requests/lesson";

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
    <div className="w-full max-w-2xl rounded-md border border-[#D0D5DD] p-4 hover:shadow-md dark:border-slate-600">
      <div className="mb-4 flex w-full flex-row items-center justify-between">
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
  );
}
