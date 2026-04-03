import { createReactBlockSpec } from "@blocknote/react";
import { Columns2Icon, SeparatorHorizontal } from "lucide-react";
import { dashedLineStyle, SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
import { COLUMN_BREAK_TYPE } from "@/lib/blocknote/column-break";
import { useSlideOverflow } from "@/components/draft/lesson/blocknote-editor-client";
import { cn } from "@/lib/utils";

/**
 * Slide Break block for BlockNote.
 * A visual divider that marks where a new presentation slide begins.
 * In the editor, it renders as a dashed line with a "Slide Break" label.
 * In presentation mode, the splitter uses these markers to create new slides.
 *
 * The optional `nextSlideLayout` prop controls the layout of the slide that
 * follows this break. Set to "two-columns" to split content into two columns.
 */
export const SlideBreak = createReactBlockSpec(
  {
    type: SLIDE_BREAK_TYPE,
    propSchema: {
      nextSlideLayout: {
        default: "default" as const,
        values: ["default", "two-columns"] as const,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const overflowingBreaks = useSlideOverflow();
      const isOverflowing = overflowingBreaks.has(props.block.id);
      const isTwoColumns = props.block.props.nextSlideLayout === "two-columns";

      function toggleLayout() {
        const enabling = !isTwoColumns;
        props.editor.updateBlock(props.block, {
          props: {
            nextSlideLayout: enabling ? "two-columns" : "default",
          },
        });

        const allBlocks = props.editor.document;
        const thisIdx = allBlocks.findIndex((b) => b.id === props.block.id);
        if (thisIdx < 0) return;

        // Find content blocks between this slide-break and the next
        const contentBlocks = [];
        for (let i = thisIdx + 1; i < allBlocks.length; i++) {
          if ((allBlocks[i].type as string) === SLIDE_BREAK_TYPE) break;
          contentBlocks.push(allBlocks[i]);
        }

        if (enabling) {
          // Auto-insert a column-break at the midpoint if none exists
          const hasColumnBreak = contentBlocks.some(
            (b) => (b.type as string) === COLUMN_BREAK_TYPE,
          );
          if (!hasColumnBreak && contentBlocks.length >= 2) {
            const midIdx = Math.ceil(contentBlocks.length / 2) - 1;
            const afterBlock = contentBlocks[midIdx];
            props.editor.insertBlocks(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [{ type: COLUMN_BREAK_TYPE as any }],
              afterBlock,
              "after",
            );
          }
        } else {
          // Remove all column-breaks in this slide when disabling
          const colBreaks = contentBlocks.filter(
            (b) => (b.type as string) === COLUMN_BREAK_TYPE,
          );
          for (const cb of colBreaks) {
            props.editor.removeBlocks([cb]);
          }
        }
      }

      return (
        <div className="pointer-events-none my-2 w-full select-none">
          <div style={dashedLineStyle} />
          <div className="h-3 w-full bg-gradient-to-b from-sky-50/40 to-transparent dark:from-sky-950/20" />
          <div className="flex items-center justify-center gap-2 py-0.5 text-xs font-semibold tracking-widest text-sky-400 uppercase dark:text-sky-500">
            <SeparatorHorizontal className="h-3 w-3" />
            Slide Break
          </div>
          <div className="pointer-events-auto flex items-center justify-center py-1">
            <button
              type="button"
              onClick={toggleLayout}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors",
                isTwoColumns
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400",
              )}
              title={
                isTwoColumns
                  ? "Next slide: two columns (click to revert)"
                  : "Set next slide to two-column layout"
              }
            >
              <Columns2Icon className="h-3 w-3" />
              {isTwoColumns ? "Two Columns" : "Single Column"}
            </button>
          </div>
          <div className="h-3 w-full bg-gradient-to-t from-sky-50/40 to-transparent dark:from-sky-950/20" />
          <div style={dashedLineStyle} />
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
              Slide content may overflow in presentation mode
            </div>
          )}
        </div>
      );
    },
  },
);
