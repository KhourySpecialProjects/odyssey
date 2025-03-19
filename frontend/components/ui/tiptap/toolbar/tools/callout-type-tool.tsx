"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalloutIcon } from "@/components/ui/callout-icons";

export default function CalloutTypeTool({
  block,
  updateBlock,
}: {
  block: any;
  updateBlock: (block: any) => void;
}) {
  const [open, setOpen] = useState(false);

  const dropdownVariants = "outline";

  return (
    <Popover open={open}>
      <PopoverTrigger asChild disabled={false}>
        <button
          onClick={() => {
            setOpen(!open);
          }}
          className={cn(
            open ? "" : "",
            "p-2.5 rounded-md border border-transparent",
          )}
        >
          <Menu color="#000000" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-red-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-red-300 dark:bg-red-300 dark:text-black mb-1"
          >
            Warning
            {<CalloutIcon color={"bg-red-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-blue-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-blue-300 dark:bg-blue-300 dark:text-black mb-1"
          >
            Question
            {<CalloutIcon color={"bg-blue-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-orange-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-orange-300 dark:bg-orange-300 dark:text-black mb-1"
          >
            Important
            {<CalloutIcon color={"bg-orange-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-green-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-green-300 dark:bg-green-300 dark:text-black mb-1"
          >
            Definition
            {<CalloutIcon color={"bg-green-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-purple-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-purple-300 dark:bg-purple-300 dark:text-black mb-1"
          >
            More Information
            {<CalloutIcon color={"bg-purple-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-amber-300",
              });
            }}
            variant={dropdownVariants}
            className="w-full border border-slate-200 bg-amber-300 dark:bg-amber-300 dark:text-black mb-1"
          >
            Caution
            {<CalloutIcon color={"bg-amber-300"}></CalloutIcon>}
          </Button>
          <Button
            onClick={(e) => {
              setOpen(false);
              e.preventDefault();
              updateBlock({
                __component: "droplets.callout",
                content: block.content,
                type: "info",
                color: "bg-sky-50 dark:bg-sky-200",
              });
            }}
            variant={dropdownVariants}
            className="bg-sky-50 dark:bg-sky-200 dark:text-black w-full border border-slate-200"
          >
            Default
            {<CalloutIcon color={"bg-sky-50"}></CalloutIcon>}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
