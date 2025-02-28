import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { UnderlineIcon } from "lucide-react";

export default function UnderlineTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleUnderline().run()}
      className={cn(
        editor?.isActive("underline") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
    >
      <UnderlineIcon size={17} />
    </button>
  );
}
