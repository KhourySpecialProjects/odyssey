import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { ListIcon } from "lucide-react";

export default function UnorderedListTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      className={cn(
        editor?.isActive("bulletList") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
      title="Unordered list"
    >
      <ListIcon size={17} />
    </button>
  );
}
