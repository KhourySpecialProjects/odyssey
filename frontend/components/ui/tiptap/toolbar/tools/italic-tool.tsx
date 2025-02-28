import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { ItalicIcon } from "lucide-react";

export default function ItalicTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleItalic().run()}
      className={cn(
        editor?.isActive("italic") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
    >
      <ItalicIcon size={17} />
    </button>
  );
}
