import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { TypeIcon } from "lucide-react";

export default function LatexTool({ editor }: { editor: Editor }) {
  return (
    <button
      //onClick={() => editor.chain().focus().toggleLatex().run()}
      className={cn(
        editor?.isActive("latex") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
      title="LaTeX"
    >
      <TypeIcon size={17} />
    </button>
  );
}
