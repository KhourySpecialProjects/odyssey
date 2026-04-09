"use client";

import { ArrowDownFromLineIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ExpandableBlockInput } from "@/components/ui/tiptap/expandable-block-input";

export type ExpandableBlock = {
  __component: "droplets.expandable";
  title: string;
  content: string;
};

export function ExpandableEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: ExpandableBlock;
  updateBlock: (block: ExpandableBlock) => void;
  deleteBlock: () => void;
}) {
  const [content, setContent] = useState(block.content);
  const [title, setTitle] = useState(block.title);

  const updateTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    updateBlock({
      __component: "droplets.expandable",
      content: content,
      title: e.target.value,
    });
  };

  const updateContent = (content: string) => {
    setContent(content);
    updateBlock({
      __component: "droplets.expandable",
      content: content,
      title: title,
    });
  };

  return (
    <div className="w-full rounded-md border border-[#D0D5DD] p-4 dark:border-slate-600">
      <div className="mb-4 flex w-full flex-row items-center justify-between">
        <h2 className="text-lg">Expandable Block</h2>
        <Trash2Icon
          className="cursor-pointer text-red-600 hover:text-red-700"
          onClick={deleteBlock}
          role="trash"
        />
      </div>
      <div className="mb-4 inline-flex w-full flex-row items-center gap-2 font-bold text-sky-600">
        <Input
          value={title}
          onChange={updateTitle}
          placeholder={"Title"}
        ></Input>
        <ArrowDownFromLineIcon className="h-4 w-4 text-sky-400" />
      </div>

      <ExpandableBlockInput
        initialContent={content}
        updateContent={updateContent}
      />
    </div>
  );
}
