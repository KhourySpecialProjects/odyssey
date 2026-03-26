import { createReactBlockSpec } from "@blocknote/react";
import { SeparatorHorizontal } from "lucide-react";

const dashedLineStyle = {
  height: "2px",
  background:
    "repeating-linear-gradient(to right, #7dd3fc 0, #7dd3fc 6px, transparent 6px, transparent 12px)",
  maskImage:
    "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
} as const;

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
