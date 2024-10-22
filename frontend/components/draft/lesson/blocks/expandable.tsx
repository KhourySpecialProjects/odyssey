"use client";

import { ArrowDownFromLineIcon } from "lucide-react";
import TipTap from "@/components/ui/tiptap";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { updateLesson } from "@/lib/actions";
import { debounce } from "lodash";

export function ExpandableEditor({
  blocks,
  id,
  lessonId,
}: {
  blocks: any;
  id: number;
  lessonId: number;
}) {
  const [content, setContent] = useState(
    blocks.find((b: any) => b.id === id).content,
  );
  const [title, setTitle] = useState(
    blocks.find((b: any) => b.id === id).title,
  );

  const updateBackend = async (content: string, title: string) => {
    const updatedBlocks = blocks.map((b: any) => {
      if (b.id === id) {
        return {
          __component: "droplets.expandable",
          content: content,
          title: title,
        };
      }
      return b;
    });
    const response = await updateLesson(
      lessonId,
      { blocks: updatedBlocks },
      false,
    );
    console.log(response);
  };

  const updateTitle = (e: any) => {
    setTitle(e.target.value);
    debouncedUpdate(content, e.target.value);
  };

  const updateContent = (content: string) => {
    setContent(content);
    debouncedUpdate(content, title);
  };

  const debouncedUpdate = useCallback(debounce(updateBackend, 1000), []);

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
