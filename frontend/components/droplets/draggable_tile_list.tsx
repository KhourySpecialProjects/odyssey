"use client";

import { Droplet } from "@/types/index.d";
import { DraggableTileListClient } from "./draggable_tile_list_client";

interface DraggableCardListProps {
  droplets: Droplet[];
  onAction?: (droplet: Droplet) => void;
  actionType?: "add" | "remove";
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  title?: string;
}

export default function DraggableTileList({
  droplets,
  onAction,
  actionType,
  onMoveUp,
  onMoveDown,
  title,
}: DraggableCardListProps) {
  return (
    <div
      className="min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 p-1 transition-colors md:p-4 dark:border-slate-500"
      data-testid="droplet-list"
    >
      {title && (
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </p>
      )}
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
