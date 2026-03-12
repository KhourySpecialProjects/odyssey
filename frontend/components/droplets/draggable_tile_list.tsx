"use client";

import { Droplet } from "@/types/index.d";
import { DraggableTileListClient } from "./draggable_tile_list_client";

interface DraggableCardListProps {
  droplets: Droplet[];
  onAction?: (droplet: Droplet) => void;
  actionType?: "add" | "remove";
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export default function DraggableTileList({
  droplets,
  onAction,
  actionType,
  onMoveUp,
  onMoveDown,
}: DraggableCardListProps) {
  return (
    <div
      className="min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 p-1 transition-colors md:p-4 dark:border-slate-500"
      data-testid="droplet-list"
    >
      <DraggableTileListClient
        droplets={droplets}
        onAction={onAction}
        actionType={actionType}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}
