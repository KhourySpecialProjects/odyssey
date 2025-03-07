import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { ListOrderedIcon } from "lucide-react";

export default function OrderedListTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      className={cn(
        editor?.isActive("orderedList") ? "bg-slate-200 dark:bg-slate-700" : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
      title="Ordered list"
    >
      <ListOrderedIcon size={17} />
    </button>
  );
}
