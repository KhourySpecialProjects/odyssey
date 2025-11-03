"use client";
import { useCallback } from "react";
import { Block } from "./add-block";
import { AddBlock } from "./add-block";
import BlockTile from "./draggable_block_tile";

export function BlockListClient({
  blocks,
  onAddBlock,
  setBlock,
  deleteBlock,
  onMoveBlock,
}: {
  blocks: Block[];
  onAddBlock: (index: number, block: Block) => void;
  setBlock: (index: number) => (block: any) => void;
  deleteBlock: (index: number) => () => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
}) {
  const addBlock = useCallback(
    (index: number) => {
      return (block: Block) => {
        onAddBlock(index, block);
      };
    },
    [onAddBlock],
  );

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
            key={`${block.__component}-${index}-${blocks.length}`}
            className="flex w-full flex-col items-center justify-center"
          >
            <AddBlock add={addBlock(index)} />
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
        <AddBlock add={addBlock(blocks.length + 1)} />
      </div>
    </>
  );
}
