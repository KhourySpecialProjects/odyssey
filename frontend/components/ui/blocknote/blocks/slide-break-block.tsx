import { createReactBlockSpec } from "@blocknote/react";
import { SeparatorHorizontal } from "lucide-react";
import { dashedLineStyle, SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";

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
    render: () => {
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
        </div>
      );
    },
  },
);
