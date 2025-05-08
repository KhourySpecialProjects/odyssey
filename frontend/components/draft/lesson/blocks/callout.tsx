"use client";

import { JSONContent } from "@tiptap/react";
import { revalidateLesson } from "@/lib/actions";
import { strapiJSONToTiptapJSON, tiptapJSONToStrapiJSON } from "@/lib/utils";
import { useCallback } from "react";
import { debounce } from "lodash";
import { Trash2Icon, Ban, GripVertical } from "lucide-react";
import { CalloutBlockInput } from "@/components/ui/tiptap/callout-block-input";
import { useState } from "react";
import CalloutTypeTool from "@/components/ui/tiptap/toolbar/tools/callout-type-tool";
import { Button } from "@lemonsqueezy/wedges";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { BlockNode } from "@/types/strapi";

export type CalloutBlock = {
  __component: "droplets.callout";
  content: BlockNode[];
  iconEnabled?: boolean;
  type: "info";
  color?: string;
};

export function CalloutEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: CalloutBlock;
  updateBlock: (block: CalloutBlock) => void;
  deleteBlock: () => void;
}) {
  const [iconEnabled, setIconEnabled] = useState(block.iconEnabled);

  const handleUpdate = useCallback((content: JSONContent) => {
    const temp: BlockNode[] = JSON.parse(
      JSON.stringify(tiptapJSONToStrapiJSON(content.content ?? [])),
    );

    updateBlock({
      __component: "droplets.callout",
      content: temp,
      type: "info",
    });
  }, []);

  useCallback(debounce(handleUpdate, 1000), []);

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
    <div className="flex flex-row items-center">
      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 z-10">
        <GripVertical size={20} />
      </div>
      <div
        className={`w-full rounded-md border border-slate-200 dark:border-slate-500 p-4 hover:shadow-md ${block.color || "bg-sky-50 dark:bg-sky-200"} `}
      >
        <div
          className={`w-full flex flex-row mb-4 justify-between items-center`}
        >
          <div className="flex flex-row items-center">
            <h2 className="text-lg dark:text-black">Callout Block</h2>
            {block.color && !block.color.includes("sky") && (
              <div className="relative">
                <Button
                  variant="transparent"
                  onClick={handleToggleIcon}
                  role="toggleButton"
                >
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

          <div className="flex flex-row items-center gap-2">
            <CalloutTypeTool block={block} updateBlock={updateBlock} />

            <Trash2Icon
              className="cursor-pointer text-red-600 hover:text-red-700"
              onClick={deleteBlock}
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
          data-testid="text-input"
        />
      </div>
    </div>
  );
}
