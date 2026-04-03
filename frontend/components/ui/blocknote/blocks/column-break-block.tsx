import { createReactBlockSpec } from "@blocknote/react";
import { Columns2 } from "lucide-react";
import { COLUMN_BREAK_TYPE } from "@/lib/blocknote/column-break";
import { useSlideOverflow } from "@/components/draft/lesson/blocknote-editor-client";

/**
 * Column Break block for BlockNote.
 * A visual marker that indicates where content splits into left and right
 * columns in presentation mode two-column slides.
 *
 * Shows "Left Column" / "Right Column" labels so authors know which side
 * their content will appear on. Displays an overflow warning if either
 * column's content exceeds the viewport height budget.
 */
export const ColumnBreak = createReactBlockSpec(
  {
    type: COLUMN_BREAK_TYPE,
    propSchema: {},
    content: "none",
  },
  {
    render: (props) => {
      const overflowingBreaks = useSlideOverflow();
      const isOverflowing = overflowingBreaks.has(props.block.id);

      return (
        <div className="pointer-events-none my-1 w-full select-none">
          <div className="flex items-center justify-end pr-1 pb-0.5 text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Left Column
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dotted border-slate-300 dark:border-slate-600" />
            <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
              <Columns2 className="h-2.5 w-2.5" />
              Column Break
            </div>
            <div className="flex-1 border-t border-dotted border-slate-300 dark:border-slate-600" />
          </div>
          <div className="flex items-center justify-end pt-0.5 pr-1 text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Right Column
          </div>
          {isOverflowing && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  clipRule="evenodd"
                />
              </svg>
              Column content may overflow in presentation mode
            </div>
          )}
        </div>
      );
    },
  },
);
