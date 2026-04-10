"use client";

import { Voyage } from "@/types";
import { XCircleIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VoyageItemProps {
  voyage: Voyage;
  index: number;
  totalVoyages: number;
  moveVoyageUp: (index: number) => void;
  moveVoyageDown: (index: number) => void;
  onRemove: (voyageId: number) => void;
}

const VoyageItem = ({
  voyage,
  index,
  totalVoyages,
  moveVoyageUp,
  moveVoyageDown,
  onRemove,
}: VoyageItemProps) => {
  return (
    <div className="relative flex items-start gap-3">
      <div className="flex flex-col gap-1 pt-4">
        <button
          onClick={() => moveVoyageUp(index)}
          disabled={index === 0}
          className={cn(
            "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            index === 0 && "cursor-not-allowed opacity-30",
          )}
          aria-label="Move block up"
          title="Move block up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => moveVoyageDown(index)}
          disabled={index === totalVoyages - 1}
          className={cn(
            "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            index === totalVoyages - 1 && "cursor-not-allowed opacity-30",
          )}
          aria-label="Move block down"
          title="Move block down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="group relative flex-1 rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center p-4">
          <div className="flex-grow">
            <div className="mb-2 flex flex-0 flex-row flex-wrap gap-1.5">
              <Badge variant="default" className="dark:bg-slate-700">
                Voyage
              </Badge>
              {voyage.voyage_nodes && (
                <Badge variant="default" className="dark:bg-slate-700">
                  {voyage.voyage_nodes.length} nodes
                </Badge>
              )}
            </div>

            <span className="block text-xl font-bold text-slate-950 dark:text-slate-300">
              {voyage.name}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(voyage.id)}
            className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
          >
            <XCircleIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface VoyageListProps {
  voyages: Voyage[];
  onReorder: (reorderedVoyages: Voyage[]) => void;
  onRemove: (voyageId: number) => void;
}

export function VoyageList({ voyages, onReorder, onRemove }: VoyageListProps) {
  const moveVoyageUp = (index: number) => {
    if (index === 0) return;
    const reorderedVoyages = [...voyages];
    [reorderedVoyages[index - 1], reorderedVoyages[index]] = [
      reorderedVoyages[index],
      reorderedVoyages[index - 1],
    ];
    onReorder(reorderedVoyages);
  };

  const moveVoyageDown = (index: number) => {
    if (index === voyages.length - 1) return;
    const reorderedVoyages = [...voyages];
    [reorderedVoyages[index], reorderedVoyages[index + 1]] = [
      reorderedVoyages[index + 1],
      reorderedVoyages[index],
    ];
    onReorder(reorderedVoyages);
  };

  return (
    <div className="space-y-2">
      {voyages.map((voyage, index) => (
        <VoyageItem
          key={voyage.id}
          voyage={voyage}
          index={index}
          totalVoyages={voyages.length}
          moveVoyageUp={moveVoyageUp}
          moveVoyageDown={moveVoyageDown}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
