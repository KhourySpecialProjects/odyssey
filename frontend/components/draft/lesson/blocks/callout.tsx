"use client";

import TipTap from "@/components/ui/tiptap";

import { JSONContent } from "@tiptap/react";
import { updateLesson } from "@/lib/actions";
import { strapiJSONToTiptapJSON, tiptapJSONToStrapiJSON } from "@/lib/utils";
import { useCallback } from "react";
import { debounce } from "lodash";

export function CalloutEditor({
  blocks,
  id,
  lessonId,
}: {
  blocks: any;
  id: number;
  lessonId: number;
}) {
  const block = blocks.find((b: any) => b.id === id);

  const updateBackend = async (content: any) => {
    const updatedBlocks = blocks.map((b: any) => {
      if (b.id === id) {
        return {
          __component: "droplets.callout",
          content: content,
          type: "info",
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

  const debounceUpdate = useCallback(debounce(updateBackend, 1000), []);

  return (
    <>
      <div className="px-6 py-6 border rounded-md w-full bg-sky-50 border-sky-200">
        <h2 className="text-lg mb-4">Callout Block</h2>
        <TipTap
          updateContent={(content: JSONContent) => {
            debounceUpdate(tiptapJSONToStrapiJSON(content.content!));
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
