import { useCallback } from "react";
import { Droplet } from "@/types/index.d";
import { useDrop } from "react-dnd";
import { cn } from "@/lib/utils";
import { DraggableTileListClient } from "./draggable_tile_list_client";

interface DraggableCardListProps {
  droplets: Droplet[];
  onDropToOther: (droplet: Droplet) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  listType: "source" | "selected";
}

export default function DraggableTileList({
  droplets,
  onDropToOther,
  onReorder,
  listType,
}: DraggableCardListProps) {
  const moveCard = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      onReorder(dragIndex, hoverIndex);
    },
    [onReorder],
  );

  interface DragItem {
    sourceList: string;
    droplet: Droplet;
  }

  const [{ isOver }, drop] = useDrop<DragItem, unknown, { isOver: boolean }>({
    accept: "DROPTILE",
    canDrop: (item: { sourceList: string }) => {
      return item.sourceList !== listType;
    },
    drop: (item: { droplet: Droplet; sourceList: string }) => {
      onDropToOther(item.droplet);
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
      className={cn(
        "min-h-[200px] rounded-lg border-2 border-dashed p-4 transition-colors dark:border-slate-500",
        isOver ? "border-slate-400 bg-slate-100/50" : "border-slate-200",
      )}
      data-testid="droplet-list"
    >
      <DraggableTileListClient
        droplets={droplets}
        moveCard={moveCard}
        listType={listType}
      />
    </div>
  );
}
