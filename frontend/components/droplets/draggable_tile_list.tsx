import { Droplet } from "@/types/index.d";
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
  return (
    <div
      className={cn(
        "min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 p-1 transition-colors md:p-4 dark:border-slate-500",
      )}
      data-testid="droplet-list"
    >
      <DraggableTileListClient
        droplets={droplets}
        onReorder={onReorder}
        listType={listType}
      />
    </div>
  );
}
