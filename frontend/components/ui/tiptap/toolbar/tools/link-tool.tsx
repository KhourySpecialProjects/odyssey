"use client";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "../../../popover";
import { Input } from "../../../input";
import { Button } from "../../../button";
import { XIcon, Link2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LinkToolButton({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const insertLink = () => {
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();

    setOpen(false);
  };

  const handleOpen = () => {
    if (editor?.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      setOpen(true);
    }
  };

  return (
    <Popover open={open}>
      <PopoverTrigger asChild onClick={handleOpen}>
        <button
          className={cn(
            editor?.isActive("link") ? "bg-slate-200" : "",
            "p-2.5 rounded-md border border-transparent hover:border-slate-200",
          )}
          title="Link"
        >
          <Link2Icon size={17} />
        </button>
      </PopoverTrigger>

      <PopoverContent autoFocus={false}>
        <Input
          value={url}
          onChange={(e: any) => setUrl(e.target.value)}
          type="text"
          tabIndex={-1}
        />
        <div className="w-full flex justify-between items-center">
          <PopoverClose onClick={() => setOpen(false)} asChild>
            <Button before={<XIcon />} className="m-2">
              Close
            </Button>
          </PopoverClose>
          <Button variant="outline" onClick={insertLink}>
            Insert
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
