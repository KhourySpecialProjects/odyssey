"use client";
import { Editor } from "@tiptap/react";
import { useRef } from "react";
import { TypeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useOffClick } from "@/components/draft/metadata/hooks/useOffClick";

export default function LatexTool({ editor }: { editor: Editor | null }) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref);

  const addNewLatex = (selection: Selection | null) => {
    if (!selection || !selection.toString().trim()) {
      editor?.chain().focus().insertContent(`$$`).run();
      setOpen(false);
      return;
    }

    const selectedText = selection.toString();

    const range = selection.getRangeAt(0);

    const latexNode = document.createTextNode(`$${selectedText}$`);

    range.deleteContents();
    range.insertNode(latexNode);
    setOpen(false);
  };

  const disabled = !(
    editor?.view?.state.selection.$from.node().type.name == "doc" ||
    editor?.view?.state.selection.$from.node(-1).type.name == "doc"
  );

  const addNewBlockLatex = (selection: Selection | null) => {
    if (!selection || !selection.toString().trim()) {
      editor?.chain().focus().insertContent(`$$$$`).run();
      setOpen(false);
      return;
    }

    const selectedText = selection.toString();

    const range = selection.getRangeAt(0);

    const latexNode = document.createTextNode(`$$${selectedText}$$`);

    range.deleteContents();
    range.insertNode(latexNode);
    setOpen(false);
  };

  return (
    <Popover open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          onClick={() => {
            setOpen(!open);
            editor?.chain().focus().run();
          }}
          className={cn(
            open ? "bg-slate-200 dark:bg-slate-700" : "",
            "rounded-md border border-transparent p-2.5 hover:border-slate-200",
          )}
          title="LaTeX"
        >
          <TypeIcon size={17} />
        </button>
      </PopoverTrigger>
      <PopoverContent ref={ref}>
        <div className="flex w-full items-center justify-between">
          <Button
            onClick={() => addNewLatex(window.getSelection())}
            className="m-2"
          >
            Inline LaTeX
          </Button>
          <Button
            onClick={() => addNewBlockLatex(window.getSelection())}
            className="m-2"
          >
            Block LaTeX
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
