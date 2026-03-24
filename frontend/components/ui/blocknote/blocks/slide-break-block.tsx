import { createReactBlockSpec } from "@blocknote/react";
import { SeparatorHorizontal } from "lucide-react";

/**
 * Slide Break block for BlockNote.
 * A visual divider that marks where a new presentation slide begins.
 * In the editor, it renders as a dashed line with a "Slide Break" label.
 * In presentation mode, the splitter uses these markers to create new slides.
 */
export const SlideBreak = createReactBlockSpec(
  {
    type: "slide-break" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div className="my-4 flex items-center gap-3 py-2 select-none">
          <div className="h-px flex-1 border-t-2 border-dashed border-sky-300 dark:border-sky-600" />
          <div className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <SeparatorHorizontal className="h-3.5 w-3.5" />
            Slide Break
          </div>
          <div className="h-px flex-1 border-t-2 border-dashed border-sky-300 dark:border-sky-600" />
        </div>
      );
    },
  },
);
