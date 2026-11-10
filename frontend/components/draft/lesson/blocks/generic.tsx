"use client";
import { DeleteBlockButton } from "./delete-block-button";
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
  deleteBlock: () => void | Promise<void>;
}) {
  const handleChange = (content: string) => {
    updateBlock({
      id: block.id,
      __component: "droplets.generic",
      content: content,
    });
  };

  return (
    <div className="w-full rounded-md border border-[#D0D5DD] p-4 hover:shadow-md dark:border-slate-600">
      <div className="mb-4 flex w-full flex-row items-center justify-between">
        <h2 className="text-lg">Text Block</h2>
        <DeleteBlockButton onDelete={deleteBlock} data-testid="delete-block" />
      </div>
      <GenericBlockInput
        revalidate={revalidateLesson}
        initialContent={block.content}
        updateContent={handleChange}
      />
    </div>
  );
}
