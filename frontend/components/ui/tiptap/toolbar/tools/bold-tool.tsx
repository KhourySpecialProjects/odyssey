import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { BoldIcon } from "lucide-react";

export default function BoldTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleBold().run()}
      className={cn(
        editor?.isActive("bold") ? "bg-slate-200 dark:bg-slate-700" : "",
        "rounded-md border border-transparent p-2.5 hover:border-slate-200",
      )}
      title="Bold"
    >
      <BoldIcon size={17} />
    </button>
  );
}
