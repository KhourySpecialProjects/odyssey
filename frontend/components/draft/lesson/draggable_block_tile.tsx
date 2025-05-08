import { useDrag, useDrop } from "react-dnd";
import { Block, OpenEndedQuizBlock, QuizBlock } from "./lesson-renderer";
import { useCallback } from "react";
import { OpenEndedQuizQuestion, QuizQuestion } from "@/types";
import { GenericEditor } from "./blocks/generic";
import { ExpandableEditor } from "./blocks/expandable";
import { CalloutEditor } from "./blocks/callout";
import { QuizEditor } from "./blocks/quiz";
import { OpenEndedQuizEditor } from "./blocks/open-ended-quiz";
import { cn } from "@/lib/utils";
import { VideoEditor } from "./blocks/video";

export default function DraggableBlockTile({
  block,
  index,
  moveCard,
  setBlock,
  deleteBlock,
}: {
  block: Block;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  setBlock: (index: number) => (block: any) => void;
  deleteBlock: (index: number) => () => void;
}) {
  const [, drag] = useDrag({
    type: "BLOCKTILE",
    item: { index, block },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ moved: boolean }>();
      if (!dropResult) {
        return;
      }
    },
  });

  const blockClassName = cn(
    "relative w-full transition-colors border rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300 bg-slate-50 dark:bg-slate-800",
  );

  const [, drop] = useDrop({
    accept: "BLOCKTILE",
    hover: (item: { index: number }) => {
      if (item.index === index) {
        return;
      }
      moveCard(item.index, index);
      item.index = index;
    },
  });

  const renderBlock = useCallback(
    (block: Block, index: number) => {
      const props = {
        block,
        updateBlock: setBlock(index),
        deleteBlock: deleteBlock(index),
      };

      switch (block.__component) {
        case "droplets.generic":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <GenericEditor {...props} />
            </div>
          );
        case "droplets.expandable":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <ExpandableEditor {...props} />
            </div>
          );
        case "droplets.video":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <VideoEditor {...props} />
            </div>
          );
        case "droplets.callout":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <CalloutEditor {...props} />
            </div>
          );
        case "droplets.quiz":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <QuizEditor
                block={{
                  ...(props.block as QuizBlock),
                  questions: (props.block.questions as QuizQuestion[]) || [],
                }}
                updateBlock={props.updateBlock}
                deleteBlock={props.deleteBlock}
              />
            </div>
          );
        case "droplets.open-ended-quiz":
          return (
            <div
              ref={(node) => {
                if (node) {
                  drag(node);
                  drop(node);
                }
              }}
              className={blockClassName}
            >
              <OpenEndedQuizEditor
                block={{
                  ...(props.block as OpenEndedQuizBlock),
                  questions:
                    (props.block.questions as OpenEndedQuizQuestion[]) || [],
                }}
                updateBlock={props.updateBlock}
                deleteBlock={props.deleteBlock}
              />
            </div>
          );
        default:
          return null;
      }
    },
    [setBlock, deleteBlock],
  );

  return renderBlock(block, index);
}
