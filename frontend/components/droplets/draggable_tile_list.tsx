import { useCallback } from "react";
import { Droplet } from "@/types/index.d";
import DraggableDropletWideTile from "./draggable-droplet-wide-tile";
import { useDrop } from "react-dnd";
import { cn } from "@/lib/utils";

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
  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    onReorder(dragIndex, hoverIndex);
  }, [onReorder]);

  interface DragItem{
    sourceList: string;
    droplet: Droplet;
  }

  const [{isOver}, drop] = useDrop<DragItem, unknown, {isOver: boolean}>({
    accept: 'DROPTILE',
    canDrop: (item: {sourceList: string}) => {
      return item.sourceList !== listType;
    },
    drop: (item: {droplet: Droplet, sourceList: string}) => {
      onDropToOther(item.droplet);
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div ref={node => {
      if (node) {
        drop(node);
      }
    }}
    className={cn(
      "min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-colors",
      isOver 
        ? "border-slate-400 bg-slate-100/50" 
        : "border-slate-200"
    )}
    >
      <div className="space-y-4">
        {droplets.map((droplet, index) => (
          <DraggableDropletWideTile key={droplet.id} droplet={droplet} index={index} moveCard={moveCard} sourceList={listType} />
        ))}
      </div>
    </div>
  );
}