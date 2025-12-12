import { Droplet } from "@/types/index.d";
import { cn } from "@/lib/utils";
import { DraggableTileListClient } from "./draggable_tile_list_client";

interface DraggableCardListProps {
  droplets: Droplet[];
}

export default function DraggableTileList({
  droplets,
}: DraggableCardListProps) {
  return (
    <div
      className={cn(
        "min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 p-1 transition-colors md:p-4 dark:border-slate-500",
      )}
      data-testid="droplet-list"
    >
      <DraggableTileListClient droplets={droplets} />
    </div>
  );
}
