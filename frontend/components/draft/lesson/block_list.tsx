"use client";
import { Block } from "./add-block";
import { BlockListClient } from "./draggable_block_list_client"; // renamed

interface BlockListProps {
  blocks: Block[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddBlock: (index: number, block: Block) => void;
  setBlock: (index: number) => (block: Block) => void;
  deleteBlock: (index: number) => () => void;
}

export default function BlockList({
  blocks,
  onReorder,
  onAddBlock,
  setBlock,
  deleteBlock,
}: BlockListProps) {
  return (
    <div
      className="min-h-[200px] rounded-lg transition-colors"
      data-testid="block-list"
    >
      <BlockListClient
        blocks={blocks}
        onMoveBlock={onReorder}
        onAddBlock={onAddBlock}
        setBlock={setBlock}
        deleteBlock={deleteBlock}
      />
    </div>
  );
}
