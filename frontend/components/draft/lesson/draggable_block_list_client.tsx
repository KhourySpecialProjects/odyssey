"use client";

import { useCallback } from "react";
import { Block } from "./lesson-renderer";
import { AddBlock } from "./add-block";
import DraggableBlockTile from "./draggable_block_tile";

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

  return (
    <>
      <div className="space-y-8 grid grid-cols-1">
        {blocks.map((block, index) => (
          <div
            key={`${block.__component}-${block.id}`}
            className="w-full flex flex-col items-center justify-center"
          >
            <DraggableBlockTile
              block={block}
              index={index}
              moveCard={moveCard}
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
