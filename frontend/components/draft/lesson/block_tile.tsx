import { Block } from "@/types";
import { useCallback } from "react";
import { GenericEditor } from "./blocks/generic";
import { ExpandableEditor } from "./blocks/expandable";
import { CalloutEditor } from "./blocks/callout";
import { QuizEditor } from "./blocks/quiz";
import { OpenEndedQuizEditor } from "./blocks/open-ended-quiz";
import { cn } from "@/lib/utils";
import { VideoEditor } from "./blocks/video";
import {
  ChevronUp,
  ChevronDown,
  SeparatorHorizontal,
  Trash2Icon,
} from "lucide-react";
import type { GenericBlock } from "./blocks/generic";
import type { ExpandableBlock } from "./blocks/expandable";
import type { VideoBlock } from "./blocks/video";
import type { CalloutBlock } from "./blocks/callout";
import {
  SLIDE_BREAK_MARKER,
  dashedLineStyle,
} from "@/lib/blocknote/slide-break";

export default function BlockTile({
  block,
  index,
  totalBlocks,
  moveBlockUp,
  moveBlockDown,
  setBlock,
  deleteBlock,
}: {
  block: Block;
  index: number;
  totalBlocks: number;
  moveBlockUp: (index: number) => void;
  moveBlockDown: (index: number) => void;
  setBlock: (index: number) => (block: Block) => void;
  deleteBlock: (index: number) => () => void;
}) {
  const renderBlock = useCallback(
    (block: Block, index: number) => {
      const props = {
        block,
        updateBlock: setBlock(index),
        deleteBlock: deleteBlock(index),
      };

      // Block reordering controls - floating on the left, vertically centered
      const blockControls = (
        <div className="absolute top-1/2 right-[-48px] flex -translate-y-1/2 flex-col gap-1">
          <button
            onClick={() => moveBlockUp(index)}
            disabled={index === 0}
            className={cn(
              "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              index === 0 && "cursor-not-allowed opacity-30",
            )}
            aria-label="Move block up"
            title="Move block up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => moveBlockDown(index)}
            disabled={index === totalBlocks - 1}
            className={cn(
              "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              index === totalBlocks - 1 && "cursor-not-allowed opacity-30",
            )}
            aria-label="Move block down"
            title="Move block down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      );

      // Slide break blocks get a special non-editable visual treatment
      const isSlideBreak =
        block.__component === "droplets.generic" &&
        block.content === SLIDE_BREAK_MARKER;

      if (isSlideBreak) {
        return (
          <div className="relative w-full">
            {blockControls}
            <div className="group relative my-2 w-full">
              <div style={dashedLineStyle} />
              <div className="h-3 w-full bg-gradient-to-b from-sky-50/40 to-transparent dark:from-sky-950/20" />
              <div className="flex items-center justify-center gap-2 py-0.5 text-xs font-semibold tracking-widest text-sky-400 uppercase dark:text-sky-500">
                <SeparatorHorizontal className="h-3 w-3" />
                Slide Break
              </div>
              <div className="h-3 w-full bg-gradient-to-t from-sky-50/40 to-transparent dark:from-sky-950/20" />
              <div style={dashedLineStyle} />
              <button
                onClick={deleteBlock(index)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                aria-label="Delete slide break"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      }

      const blockContent = (() => {
        switch (block.__component) {
          case "droplets.generic":
            return <GenericEditor {...props} block={block as GenericBlock} />;
          case "droplets.expandable":
            return (
              <ExpandableEditor {...props} block={block as ExpandableBlock} />
            );
          case "droplets.video":
            return <VideoEditor {...props} block={block as VideoBlock} />;
          case "droplets.callout":
            return (
              <CalloutEditor
                block={block as unknown as CalloutBlock}
                updateBlock={(calloutBlock: CalloutBlock) => {
                  setBlock(index)(calloutBlock as Block);
                }}
                deleteBlock={deleteBlock(index)}
              />
            );
          case "droplets.quiz":
            return (
              <QuizEditor
                block={
                  props.block as Extract<
                    Block,
                    { __component: "droplets.quiz" }
                  >
                }
                updateBlock={(partialBlock: Partial<Block>) => {
                  setBlock(index)(partialBlock as Block);
                }}
                deleteBlock={props.deleteBlock}
              />
            );

          case "droplets.open-ended-quiz":
            return (
              <OpenEndedQuizEditor
                block={
                  props.block as Extract<
                    Block,
                    { __component: "droplets.open-ended-quiz" }
                  >
                }
                updateBlock={(
                  partialBlock: Partial<
                    Extract<Block, { __component: "droplets.open-ended-quiz" }>
                  >,
                ) => {
                  setBlock(index)(partialBlock as Block);
                }}
                deleteBlock={props.deleteBlock}
              />
            );
          default:
            return null;
        }
      })();

      return (
        <div className="relative w-full">
          {blockControls}
          <div className="w-full rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
            {blockContent}
          </div>
        </div>
      );
    },
    [setBlock, deleteBlock, moveBlockUp, moveBlockDown, totalBlocks],
  );

  return renderBlock(block, index);
}
