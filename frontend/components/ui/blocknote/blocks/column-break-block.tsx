import { createReactBlockSpec } from "@blocknote/react";
import { Columns2 } from "lucide-react";
import { COLUMN_BREAK_TYPE } from "@/lib/blocknote/column-break";

/**
 * Column Break block for BlockNote.
 * A subtle visual marker that indicates where content should split into
 * left and right columns in presentation mode two-column slides.
 *
 * Intentionally minimal compared to SlideBreak — no interactivity,
 * no gradient backgrounds, no toggle buttons. Just a thin dotted line
 * with a small muted label.
 */
export const ColumnBreak = createReactBlockSpec(
  {
    type: COLUMN_BREAK_TYPE,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div className="pointer-events-none my-1 w-full select-none">
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dotted border-slate-300 dark:border-slate-600" />
            <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
              <Columns2 className="h-2.5 w-2.5" />
              Column Break
            </div>
            <div className="flex-1 border-t border-dotted border-slate-300 dark:border-slate-600" />
          </div>
        </div>
      );
    },
  },
);
