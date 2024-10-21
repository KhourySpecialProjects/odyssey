"use client";

import { updateLesson } from "@/lib/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AddBlock({
  add
}: {
  add : (block : any) => void
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full flex justify-center items-center gap-3 flex-wrap max-w-2xl">
      <Popover open={open}>
        <PopoverTrigger asChild onClick={() => setOpen(true)}>
          <Button className="bg-slate-600 text-white px-3 py-2 rounded-md hover:bg-slate-700">
            Add Block
          </Button>
        </PopoverTrigger>

        <PopoverContent className="space-y-1">
          <Button
            onClick={() => {
              setOpen(false)
              add({
                    __component: "droplets.generic",
                    content: "",
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Generic Rich Text Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
                add({
                    __component: "droplets.expandable",
                    title: "",
                    content: "",
                });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Expandable Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
                add({
                    __component: "droplets.callout",
                    content: [{type: "paragraph", children: [{type: "text", text: ""}]}],
                    type: "info",
                });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Callout Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
              add( {
                __component: "droplets.video",
                url: "https://www.youtube.com/asdfgsfd",
              })
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
