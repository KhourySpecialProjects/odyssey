"use client";
import { Block } from "@/types";
import { BlockListClient } from "./block_list_client";

interface BlockListProps {
  blocks: Block[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  setBlock: (index: number) => (block: Block) => void;
  deleteBlock: (index: number) => () => void;
}

export default function BlockList({
  blocks,
  onReorder,
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
        setBlock={setBlock}
        deleteBlock={deleteBlock}
      />
    </div>
  );
}
