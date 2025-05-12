import { useDrag, useDrop } from "react-dnd";
import { Droplet, Tag } from "@/types/index.d";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import { cn, uppercaseFirstChar } from "@/lib/utils";

interface DraggableDropletWideTileProps {
  droplet: Droplet;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  sourceList: string;
}

export default function DraggableDropletWideTile({
  droplet,
  index,
  moveCard,
  sourceList,
}: DraggableDropletWideTileProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "DROPTILE",
    item: { index, droplet, sourceList },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ moved: boolean }>();
      if (!dropResult) {
        return;
      }
    },
  });

  const [, drop] = useDrop({
    accept: "DROPTILE",
    hover: (item: { index: number; sourceList: string }) => {
      if (item.index === index || item.sourceList !== sourceList) {
        return;
      }
      moveCard(item.index, index);
      item.index = index;
    },
  });

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(node);
          drop(node);
        }
      }}
      className={cn(
        "relative rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800",
        isDragging && "opacity-50",
      )}
    >
      <div className="p-4">
        <div className="flex flex-col justify-end gap-2">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <div className="z-10 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing">
              <GripVertical size={20} />
            </div>
            {droplet.status === "draft" && (
              <Badge variant="destructive">Draft</Badge>
            )}
            <Badge variant="default" className="dark:bg-purple-800">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge
              variant="secondary"
              className="dark:bg-slate-700 dark:text-white"
            >
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.tags?.map((tag: Tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>

          <span className="block w-full place-self-end pt-2 pl-1 text-xl font-black text-slate-950 dark:text-slate-300">
            {droplet.name}
          </span>
        </div>
      </div>
    </div>
  );
}
