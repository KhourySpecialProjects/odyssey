"use client";

import { updateLesson } from "@/lib/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function AddBlock({
  blocks,
  lessonId,
  index,
}: {
  blocks: any;
  lessonId: number;
  index: number;
}) {
  const updateBackend = async (updatedBlocks: any) => {
    const response = await updateLesson(
      lessonId,
      { blocks: updatedBlocks },
      true,
    );
    console.log(response);
  };
  return (
    <div className="w-full flex justify-center items-center gap-3 flex-wrap max-w-2xl">
      <Popover>
        <PopoverTrigger asChild>
          <button className="bg-slate-600 text-white px-3 py-2 rounded-xl hover:bg-slate-700">
            Add Block
          </button>
        </PopoverTrigger>

        <PopoverContent className="space-y-1">
          <Button
            onClick={() => {
              const updatedBlocks = [...blocks];
              updatedBlocks.splice(index, 0, {
                __component: "droplets.generic",
                content: "",
              });
              updateBackend(updatedBlocks);
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Generic Rich Text Block
          </Button>
          <Button
            onClick={() => {
              const updatedBlocks = [...blocks];
              updatedBlocks.splice(index, 0, {
                __component: "droplets.expandable",
                title: "",
                content: "",
              });
              updateBackend(updatedBlocks);
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Expandable Block
          </Button>
          <Button
            onClick={() => {
              const updatedBlocks = [...blocks];
              updatedBlocks.splice(index, 0, {
                __component: "droplets.callout",
                content: [],
                type: "info",
              });
              updateBackend(updatedBlocks);
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Callout Block
          </Button>
          <Button
            onClick={() => {
              const updatedBlocks = [...blocks];
              updatedBlocks.splice(index, 0, {
                __component: "droplets.video",
                url: "https://www.youtube.com/asdfasjkgasdfj",
              });
              updateBackend(updatedBlocks);
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Video Block
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
