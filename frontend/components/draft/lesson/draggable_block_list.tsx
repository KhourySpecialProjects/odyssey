"use client";

import { useCallback } from "react";
import { useDrop } from "react-dnd";
import { Block } from "./lesson-renderer";
import { DraggableBlockListClient } from "./draggable_block_list_client";

interface DraggableCardListProps {
  blocks: Block[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddBlock: (index: number, block: Block) => void;
  setBlock: (index: number) => (block: any) => void;
  deleteBlock: (index: number) => () => void;
}

export default function DraggableBlockList({
  blocks,
  onReorder,
  onAddBlock,
  setBlock,
  deleteBlock,
}: DraggableCardListProps) {
  const moveCard = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      onReorder(dragIndex, hoverIndex);
    },
    [onReorder],
  );

  interface DragItem {
    sourceList: string;
    block: Block;
  }

  const [{}, drop] = useDrop<DragItem, unknown, { isOver: boolean }>({
    accept: "BLOCK",
    drop: (item: { block: Block; sourceList: string }) => {
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => {
        if (node) {
          drop(node);
        }
      }}
      className="min-h-[200px] rounded-lg transition-colors"
      data-testid="block-list"
    >
      <DraggableBlockListClient
        blocks={blocks}
        moveCard={moveCard}
        onAddBlock={onAddBlock}
        setBlock={setBlock}
        deleteBlock={deleteBlock}
      />
    </div>
  );
}
