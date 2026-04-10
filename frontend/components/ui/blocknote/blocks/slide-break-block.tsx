import { createReactBlockSpec } from "@blocknote/react";
import { ArrowDown, Columns2Icon, TriangleAlert } from "lucide-react";
import { SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
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

      // Detect if two-column layout is on but column break was removed
      const missingColumnBreak = (() => {
        if (!isTwoColumns) return false;
        const allBlocks = props.editor.document;
        const thisIdx = allBlocks.findIndex((b) => b.id === props.block.id);
        if (thisIdx < 0) return false;
        for (let i = thisIdx + 1; i < allBlocks.length; i++) {
          if ((allBlocks[i].type as string) === SLIDE_BREAK_TYPE) break;
          if ((allBlocks[i].type as string) === COLUMN_BREAK_TYPE) return false;
        }
        return true;
      })();

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
        <div className="pointer-events-none my-1 w-full select-none">
          {/* Top rule with centered label */}
          <div className="flex items-center gap-2.5 px-4">
            <div className="h-0.5 flex-1 rounded-full bg-sky-300 dark:bg-sky-600" />
            <div className="flex items-center gap-1.5">
              <ArrowDown className="h-3 w-3 text-sky-500 dark:text-sky-400" />
              <span className="text-[11px] font-bold tracking-widest text-sky-600 uppercase dark:text-sky-400">
                New Slide
              </span>
              <ArrowDown className="h-3 w-3 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="h-0.5 flex-1 rounded-full bg-sky-300 dark:bg-sky-600" />
          </div>

          {/* Layout toggle */}
          <div className="pointer-events-auto flex justify-center py-1">
            <button
              type="button"
              onClick={toggleLayout}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
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
              <Columns2Icon className="h-2.5 w-2.5" />
              {isTwoColumns ? "Two Columns" : "Single Column"}
            </button>
          </div>

          {/* Bottom rule */}
          <div className="px-4">
            <div className="h-0.5 rounded-full bg-sky-300 dark:bg-sky-600" />
          </div>

          {/* Warning: missing column break */}
          {missingColumnBreak && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Two-column layout is on but no Column Break found — content will
              auto-split at midpoint
            </div>
          )}

          {/* Warning: overflow */}
          {isOverflowing && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Slide content may overflow in presentation mode
            </div>
          )}
        </div>
      );
    },
  },
);
