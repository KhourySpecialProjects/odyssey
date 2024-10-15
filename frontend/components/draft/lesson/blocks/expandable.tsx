"use client";

import { ArrowDownFromLineIcon } from "lucide-react";
import TipTap from "@/components/ui/tiptap";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect, useRef } from "react";
import { updateLesson } from "@/lib/actions";
import { debounce } from "lodash";

export function ExpandableEditor({
  block,
  updateBlock,
}: {
  block : any,
  updateBlock: (block: any) => void;
}) {
  const [content, setContent] = useState(
    block.content
  );
  const [title, setTitle] = useState(
    block.title
  );
  

  const updateTitle = (e: any) => {
    setTitle(e.target.value);
    updateBlock({
        __component: "droplets.expandable",
          content: content,
          title: e.target.value,
    })
  };

  const updateContent = (content: string) => {
    setContent(content);
    updateBlock({
        __component: "droplets.expandable",
          content: content,
          title: title,
    })
    
  };



  

  return (
    <div className="w-full p-4 border rounded-md border-slate-200">
      <div className="inline-flex flex-row items-center gap-2 font-bold text-sky-600 w-full">
        <Input
          className="mb-3"
          value={title}
          onChange={updateTitle}
          placeholder={"Expandable Title"}
        ></Input>
        <ArrowDownFromLineIcon className="w-4 h-4 text-sky-400" />
      </div>
      <Separator />

      <TipTap
        className="mt-3"
        variant="lesson-expandable-body"
        initialContent={content}
        updateContent={updateContent}
      />
    </div>
  );
}
