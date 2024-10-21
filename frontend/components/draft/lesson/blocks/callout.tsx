"use client";

import TipTap from "@/components/ui/tiptap";

import { JSONContent } from "@tiptap/react";
import { updateLesson } from "@/lib/actions";
import { strapiJSONToTiptapJSON, tiptapJSONToStrapiJSON } from "@/lib/utils";
import { useCallback } from "react";
import { debounce } from "lodash";
import type { BlockNode } from "@/types/strapi";
import { Trash2Icon } from "lucide-react";

export function CalloutEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: any,
  updateBlock: (block: any) => void;
  deleteBlock: () => void;
}) {


  const handleUpdate = useCallback((content : any) => {
    let temp : any = JSON.parse(JSON.stringify(tiptapJSONToStrapiJSON(content.content ?? [])))

    updateBlock({
        __component: "droplets.callout",
        content: temp,
        type: "info",})
    
  }, [])

  const debounceUpdate = useCallback(debounce(handleUpdate, 1000), []);

  return (
    <>
      <div className="hover:shadow-md px-6 py-6 border rounded-md w-full bg-sky-50 border-sky-200">
        <div className="w-full flex flex-row  mb-4 justify-between items-center">
            <h2 className="text-lg">Callout Block</h2>
            <Trash2Icon className="cursor-pointer text-red-600 hover:text-red-700" onClick={deleteBlock}/>
        </div>
        <TipTap
          updateContent={(content: JSONContent) => {
            handleUpdate(content);
          }}
          initialContent={
            {
              type: "doc",
              content: strapiJSONToTiptapJSON(block.content),
            } as JSONContent
          }
          json
          variant="lesson-callout"
        />
      </div>
    </>
  );
}
