"use client";
import { useCallback } from "react";
import AddLessonBlock, { Block } from "./add-tools";
import DraggableBlockTile from "./draggable_block_tile";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
export function DraggableBlockListClient({
  blocks,
  moveCard,
  onAddBlock,
  setBlock,
  deleteBlock,
}: {
  blocks: Block[];
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onAddBlock: (index: number, block: Block) => void;
  setBlock: (index: number) => (block: any) => void;
  deleteBlock: (index: number) => () => void;
}) {
  const addBlock = useCallback(
    (index: number) => {
      return (block: Block) => {
        onAddBlock(index, block);
      };
    },
    [onAddBlock],
  );

  if (blocks.length === 0) {
    return (
      <>
        <Message className="mb-8 rounded-md dark:border-slate-500 dark:bg-slate-800">
          <MessageHeader subtitle="" title="No Blocks" />
          <MessageDescription>
            Use the add button to get started!
          </MessageDescription>
        </Message>
      </>
    );
  }
  return (
    <div className="grid grid-cols-1 space-y-8">
      {blocks.map((block, index) => (
        <div
          key={`${block.__component}-${index}-${blocks.length}`}
          className="flex w-full flex-col items-center justify-center"
        >
          <AddLessonBlock
            onAddBlock={(blockType, calloutType) =>
              onAddBlock(index, createBlock(blockType, calloutType))
            }
          />
          <DraggableBlockTile
            block={block}
            index={index}
            moveCard={moveCard}
            setBlock={setBlock}
            deleteBlock={deleteBlock}
          />
          <AddLessonBlock
            onAddBlock={(blockType, calloutType) =>
              onAddBlock(index, createBlock(blockType, calloutType))
            }
          />
        </div>
      ))}
    </div>
  );
}
