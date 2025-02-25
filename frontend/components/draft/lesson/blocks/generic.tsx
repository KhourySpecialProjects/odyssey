"use client";
import { revalidateLesson } from "@/lib/actions";
import { Trash2Icon } from "lucide-react";
import { GenericBlockInput } from "@/components/ui/tiptap/generic-block-input";

export function GenericEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: any;
  updateBlock: (block: any) => void;
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
    <div className="w-full rounded-md border border-slate-200 p-4 hover:shadow-md">
      <div className="w-full flex flex-row  mb-4 justify-between items-center">
        <h2 className="text-lg">Generic Rich Text Block</h2>
        <Trash2Icon
          className="cursor-pointer text-red-600 hover:text-red-700"
          onClick={deleteBlock}
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
