"use client";
import { useCallback } from "react";
import { Block } from "@/types";
import BlockTile from "./block_tile";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
export function BlockListClient({
  blocks,
  setBlock,
  deleteBlock,
  onMoveBlock,
}: {
  blocks: Block[];
  setBlock: (index: number) => (block: Block) => void;
  deleteBlock: (index: number) => () => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
}) {
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
  const moveBlockUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      onMoveBlock(index, index - 1);
    },
    [onMoveBlock],
  );

  const moveBlockDown = useCallback(
    (index: number) => {
      if (index === blocks.length - 1) return;
      onMoveBlock(index, index + 1);
    },
    [onMoveBlock, blocks.length],
  );

  return (
    <>
      <div className="grid grid-cols-1 space-y-8">
        {blocks.map((block, index) => (
          <div
            key={block._clientId || block.id || `fallback-${index}`}
            className="flex w-full flex-col items-center justify-center"
          >
            <BlockTile
              block={block}
              index={index}
              totalBlocks={blocks.length}
              moveBlockUp={moveBlockUp}
              moveBlockDown={moveBlockDown}
              setBlock={setBlock}
              deleteBlock={deleteBlock}
            />
          </div>
        ))}
      </div>
    </>
  );
}
