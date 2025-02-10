"use client";

import { JSONContent } from "@tiptap/react";
import { revalidateLesson } from "@/lib/actions";
import { strapiJSONToTiptapJSON, tiptapJSONToStrapiJSON } from "@/lib/utils";
import { useCallback } from "react";
import { debounce } from "lodash";
import { Trash2Icon } from "lucide-react";
import { CalloutBlockInput } from "@/components/ui/tiptap/callout-block-input";
import { useState, useEffect } from "react";
import CalloutTypeTool from "@/components/ui/tiptap/toolbar/tools/callout-type-tool";
import { Button } from "@lemonsqueezy/wedges";
import { CalloutIcon } from "@/components/ui/callout-icons";

export function CalloutEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: any;
  updateBlock: (block: any) => void;
  deleteBlock: () => void;
}) {
  const handleUpdate = useCallback((content: any) => {
    console.log(" --> callout.tsx: handleUpdate useCallback handler");
    let temp: any = JSON.parse(
      JSON.stringify(tiptapJSONToStrapiJSON(content.content ?? [])),
    );

    updateBlock({
      __component: "droplets.callout",
      content: temp,
      type: "info",
    });
  }, []);

  const debounceUpdate = useCallback(debounce(handleUpdate, 1000), []);

  return (
    <>
      <div
        className={`hover:shadow-md px-6 py-6 border rounded-md w-full ${block.color || "bg-sky-50"} `}
      >
        <div
          className={`w-full flex flex-row  mb-4 justify-between items-center`}
        >
          <div className="flex flex-row items-center">
            <h2 className="text-lg font-bold text-white mr-3">Callout Block</h2>
            <CalloutIcon color={block.color}></CalloutIcon>
          </div>
          <div className="flex flex-row items-center">
            <CalloutTypeTool block={block} updateBlock={updateBlock} />

            <Trash2Icon
              className="cursor-pointer text-white"
              onClick={deleteBlock}
              size={30}
            />
          </div>
        </div>
        <CalloutBlockInput
          revalidate={revalidateLesson}
          updateContent={(content: JSONContent) => {
            handleUpdate(content);
          }}
          initialContent={
            {
              type: "doc",
              content: strapiJSONToTiptapJSON(block.content),
            } as JSONContent
          }
        />
      </div>
    </>
  );
}
