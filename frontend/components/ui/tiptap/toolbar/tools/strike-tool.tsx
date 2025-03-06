import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { StrikethroughIcon } from "lucide-react";

export default function StrikeTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleStrike().run()}
      className={cn(
        editor?.isActive("strike") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
      title="Strikethrough"
    >
      <StrikethroughIcon size={17} />
    </button>
  );
}
