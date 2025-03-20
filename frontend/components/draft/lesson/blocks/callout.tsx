"use client";

import { JSONContent } from "@tiptap/react";
import { revalidateLesson } from "@/lib/actions";
import { strapiJSONToTiptapJSON, tiptapJSONToStrapiJSON } from "@/lib/utils";
import { useCallback } from "react";
import { debounce } from "lodash";
import { Trash2Icon, Ban } from "lucide-react";
import { CalloutBlockInput } from "@/components/ui/tiptap/callout-block-input";
import { useState } from "react";
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
  const [iconEnabled, setIconEnabled] = useState(block.iconEnabled);

  const handleUpdate = useCallback((content: any) => {
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

  const handleToggleIcon = () => {
    updateBlock({
      __component: "droplets.callout",
      content: block.content,
      type: "info",
      color: block.color,
      iconEnabled: !iconEnabled,
    });
    setIconEnabled(!iconEnabled);
  };

  return (
    <>
      <div
        className={`hover:shadow-md px-6 py-6 border dark:border-slate-500 rounded-md w-full ${block.color || "bg-sky-50"} `}
      >
        <div
          className={`w-full flex flex-row  mb-4 justify-between items-center`}
        >
          <div className="flex flex-row items-center">
            <h2 className="text-lg font-bold text-black mr-3">Callout Block</h2>
            {block.color && !block.color.includes("sky") && (
              <div className="relative">
                <Button variant="transparent" onClick={handleToggleIcon}>
                  <CalloutIcon
                    color={block.color || "bg-sky-300"}
                  ></CalloutIcon>
                  {!iconEnabled && (
                    <Ban className="absolute top-0 left-0 w-full h-full text-red-500" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-row items-center">
            <CalloutTypeTool block={block} updateBlock={updateBlock} />

            <Trash2Icon
              className="cursor-pointer text-black"
              onClick={deleteBlock}
              size={30}
              role="trash"
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
