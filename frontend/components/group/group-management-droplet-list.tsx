"use client";

import { Droplet } from "@/types";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { XCircleIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";

function useCombinedRefs(...refs: any[]) {
  const targetRef = useRef(null);

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === "function") {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
}

interface DropletItemProps {
  droplet: Droplet;
  index: number;
  moveDroplet: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (dropletId: number) => void;
}

const DropletItem = ({
  droplet,
  index,
  moveDroplet,
  onRemove,
}: DropletItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: "droplet",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "droplet",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveDroplet(item.index, index);
        item.index = index;
      }
    },
  });

  const combinedRef = useCombinedRefs(drag, drop);

  return (
    <div
      ref={combinedRef}
      className={`relative group transition-colors border rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center p-4">
        <div {...drag} className="cursor-grab active:cursor-grabbing mr-4">
          <GripVertical className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="flex-grow">
          <div className="flex flex-row flex-wrap flex-0 gap-1.5 mb-2">
            <Badge variant="default" className="dark:bg-slate-700">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="secondary" className="dark:bg-slate-700">
              {uppercaseFirstChar(droplet.type)}
            </Badge>
          </div>

          <span className="block text-xl font-bold text-slate-950 dark:text-slate-300">
            {droplet.name}
          </span>

          {droplet.lessons && (
            <p className="text-sm text-muted-foreground mt-1">
              {droplet.lessons.length} lessons
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(droplet.id)}
          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <XCircleIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

interface DropletListProps {
  droplets: Droplet[];
  onReorder: (reorderedDroplets: Droplet[]) => void;
  onRemove: (dropletId: number) => void;
}

export function DropletList({
  droplets,
  onReorder,
  onRemove,
}: DropletListProps) {
  const moveDroplet = (dragIndex: number, hoverIndex: number) => {
    const reorderedDroplets = [...droplets];
    const [draggedItem] = reorderedDroplets.splice(dragIndex, 1);
    reorderedDroplets.splice(hoverIndex, 0, draggedItem);
    onReorder(reorderedDroplets);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
        {droplets.map((droplet, index) => (
          <DropletItem
            key={droplet.id}
            droplet={droplet}
            index={index}
            moveDroplet={moveDroplet}
            onRemove={onRemove}
          />
        ))}
      </div>
    </DndProvider>
  );
}
