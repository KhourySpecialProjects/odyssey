import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { Heading1 } from "lucide-react";
import { Heading2 } from "lucide-react";
import { Heading3 } from "lucide-react";

export default function HeadingTool({
  editor,
  number,
}: {
  editor: Editor;
  number: number;
}) {
  return (
    <button
      onClick={() =>
        editor
          .chain()
          .focus()
          .toggleHeading({ level: number as 1 | 2 | 3 })
          .run()
      }
      className={cn(
        editor?.isActive("heading", { level: number })
          ? "bg-slate-200 dark:bg-slate-700"
          : "",
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
      title={
        number === 1 ? "Heading 1" : number === 2 ? "Heading 2" : "Heading 3"
      }
    >
      {(() => {
        switch (number) {
          case 1:
            return <Heading1 size={17} />;
          case 2:
            return <Heading2 size={17} />;
          default:
            return <Heading3 size={17} />;
        }
      })()}
    </button>
  );
}
