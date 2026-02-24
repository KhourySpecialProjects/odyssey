"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Droplet } from "@/types";
import DraggableDropletWideTile from "./draggable-droplet-wide-tile";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export function DraggableTileListClient({
  droplets,
  onAction,
  actionType,
  onMoveUp,
  onMoveDown,
}: {
  droplets: Droplet[];
  onAction?: (droplet: Droplet) => void;
  actionType?: "add" | "remove";
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(droplets.length / ITEMS_PER_PAGE));

  // Reset to last valid page when droplets shrink (e.g. after removing items)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDroplets = droplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div>
      <div className="space-y-2">
        {paginatedDroplets.map((droplet, pageIndex) => {
          const globalIndex = startIndex + pageIndex;
          return (
            <DraggableDropletWideTile
              key={droplet.id}
              droplet={droplet}
              onAction={onAction ? () => onAction(droplet) : undefined}
              actionType={actionType}
              index={globalIndex}
              totalItems={droplets.length}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          );
        })}
        {paginatedDroplets.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No droplets</p>
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 dark:bg-slate-300 dark:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0 dark:bg-slate-300 dark:text-black"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
