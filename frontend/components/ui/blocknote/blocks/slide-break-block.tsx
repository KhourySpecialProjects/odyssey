import { createReactBlockSpec } from "@blocknote/react";
import { SeparatorHorizontal } from "lucide-react";
import { dashedLineStyle, SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
import { useSlideOverflow } from "@/components/draft/lesson/blocknote-editor-client";

/**
 * Slide Break block for BlockNote.
 * A visual divider that marks where a new presentation slide begins.
 * In the editor, it renders as a dashed line with a "Slide Break" label.
 * In presentation mode, the splitter uses these markers to create new slides.
 */
export const SlideBreak = createReactBlockSpec(
  {
    type: SLIDE_BREAK_TYPE,
    propSchema: {},
    content: "none",
  },
  {
    render: (props) => {
      const overflowingBreaks = useSlideOverflow();
      const isOverflowing = overflowingBreaks.has(props.block.id);

      return (
        <div className="pointer-events-none my-2 w-full select-none">
          <div style={dashedLineStyle} />
          <div className="h-3 w-full bg-gradient-to-b from-sky-50/40 to-transparent dark:from-sky-950/20" />
          <div className="flex items-center justify-center gap-2 py-0.5 text-xs font-semibold tracking-widest text-sky-400 uppercase dark:text-sky-500">
            <SeparatorHorizontal className="h-3 w-3" />
            Slide Break
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
