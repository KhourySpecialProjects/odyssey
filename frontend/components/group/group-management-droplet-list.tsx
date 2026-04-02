"use client";

import { Droplet } from "@/types";
import { XCircleIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar, cn, getDifficultyBadgeColor } from "@/lib/utils";

interface DropletItemProps {
  droplet: Droplet;
  index: number;
  totalDroplets: number;
  moveDropletUp: (index: number) => void;
  moveDropletDown: (index: number) => void;
  onRemove: (dropletId: number) => void;
}

const DropletItem = ({
  droplet,
  index,
  totalDroplets,
  moveDropletUp,
  moveDropletDown,
  onRemove,
}: DropletItemProps) => {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const strippedDescription = droplet.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  return (
    <div className="relative flex items-start gap-3">
      {/* Arrow controls on the left */}
      <div className="flex flex-col gap-1 pt-4">
        <button
          onClick={() => moveDropletUp(index)}
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
          onClick={() => moveDropletDown(index)}
          disabled={index === totalDroplets - 1}
          className={cn(
            "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            index === totalDroplets - 1 && "cursor-not-allowed opacity-30",
          )}
          aria-label="Move block down"
          title="Move block down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Droplet content */}
      <div className="group relative flex-1 rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center p-4">
          <div className="flex-grow">
            <div className="mb-2 flex flex-0 flex-row flex-wrap gap-1.5">
              <Badge variant="default" className="dark:bg-slate-700">
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge variant="secondary" className="dark:bg-slate-700">
                {uppercaseFirstChar(droplet.type)}
              </Badge>
              {droplet.difficulty && (
                <Badge
                  variant="outline"
                  className={getDifficultyBadgeColor(droplet.difficulty)}
                >
                  {uppercaseFirstChar(droplet.difficulty)}
                </Badge>
              )}
            </div>

            <span className="block text-xl font-bold text-slate-950 dark:text-slate-300">
              {droplet.name}
            </span>

            {droplet.lessons && (
              <p className="text-muted-foreground mt-1 text-sm">
                {droplet.lessons.length} lessons
              </p>
            )}
            {strippedDescription &&
              strippedDescription.trim() !== "<p></p>" &&
              strippedDescription.trim() !== "" && (
                <>
                  <p
                    className={`${
                      descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                    } text-md pt-1 pr-8 text-slate-700 dark:text-slate-300`}
                  >
                    {strippedDescription}
                  </p>
                  <p>
                    {descriptionExpanded ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDescriptionExpanded(false);
                        }}
                        className="text-sm text-sky-700 dark:text-sky-500"
                      >
                        See Less
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDescriptionExpanded(true);
                        }}
                        className="text-sm text-sky-700 dark:text-sky-500"
                      >
                        See More
                      </button>
                    )}
                  </p>
                </>
              )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(droplet.id)}
            className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
          >
            <XCircleIcon className="h-5 w-5" />
          </Button>
        </div>
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
  const moveDropletUp = (index: number) => {
    if (index === 0) return;
    const reorderedDroplets = [...droplets];
    [reorderedDroplets[index - 1], reorderedDroplets[index]] = [
      reorderedDroplets[index],
      reorderedDroplets[index - 1],
    ];
    onReorder(reorderedDroplets);
  };

  const moveDropletDown = (index: number) => {
    if (index === droplets.length - 1) return;
    const reorderedDroplets = [...droplets];
    [reorderedDroplets[index], reorderedDroplets[index + 1]] = [
      reorderedDroplets[index + 1],
      reorderedDroplets[index],
    ];
    onReorder(reorderedDroplets);
  };

  return (
    <div className="space-y-2">
      {droplets.map((droplet, index) => (
        <DropletItem
          key={droplet.id}
          droplet={droplet}
          index={index}
          totalDroplets={droplets.length}
          moveDropletUp={moveDropletUp}
          moveDropletDown={moveDropletDown}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
