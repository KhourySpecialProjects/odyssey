"use client";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUpToLineIcon,
  LoaderIcon,
  XIcon,
  ImagePlusIcon,
  Menu,
} from "lucide-react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadImage } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { tiptapJSONToStrapiJSON } from "@/lib/utils";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { useOffClick } from "@/components/draft/metadata/hooks/useOffClick";
import { useRef } from "react";

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
          <Menu color="#ffffff" />
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
            className="w-full border border-slate-200 bg-red-300 mb-1"
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
            className="w-full border border-slate-200 bg-blue-300 mb-1"
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
            className="w-full border border-slate-200 bg-orange-300 mb-1"
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
            className="w-full border border-slate-200 bg-green-300 mb-1"
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
            className="w-full border border-slate-200 bg-purple-300 mb-1"
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
            className="w-full border border-slate-200 bg-amber-300"
          >
            Caution
            {<CalloutIcon color={"bg-amber-300"}></CalloutIcon>}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
