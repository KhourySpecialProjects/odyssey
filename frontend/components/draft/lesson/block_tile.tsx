import { OpenEndedQuizBlock, QuizBlock } from "./lesson-renderer";
import { Block } from "@/types";
import { useCallback } from "react";
import { OpenEndedQuizQuestion, QuizQuestion } from "@/types";
import { GenericEditor } from "./blocks/generic";
import { ExpandableEditor } from "./blocks/expandable";
import { CalloutEditor } from "./blocks/callout";
import { QuizEditor } from "./blocks/quiz";
import { OpenEndedQuizEditor } from "./blocks/open-ended-quiz";
import { cn } from "@/lib/utils";
import { VideoEditor } from "./blocks/video";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { GenericBlock } from "./blocks/generic";
import type { ExpandableBlock } from "./blocks/expandable";
import type { VideoBlock } from "./blocks/video";
import type { CalloutBlock } from "./blocks/callout";

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
  setBlock: (index: number) => (block: any) => void;
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
                {...props}
                block={block as unknown as CalloutBlock}
              />
            );
          case "droplets.quiz":
  return (
    <QuizEditor
      block={props.block as Extract<Block, { __component: "droplets.quiz" }>}
      updateBlock={props.updateBlock}
      deleteBlock={props.deleteBlock}
    />
  );

case "droplets.open-ended-quiz":
  return (
    <OpenEndedQuizEditor
      block={props.block as Extract<Block, { __component: "droplets.open-ended-quiz" }>}
      updateBlock={props.updateBlock}
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
