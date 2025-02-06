"use client";

import { Droplet } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { useMemo } from "react";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getDropletAverageRating } from "@/lib/requests/enrollment";

interface SortedDropletsGridProps {
  droplets: Array<Droplet & { completionPercentage: number }>;
  sortKey?: string;
  completedLessonIds: number[];
  enrolledDropletIds: number[];
  searchValue?: string;
  ratingsMap: Map<number, number>;
}

export function SortedDropletsGrid({
  droplets,
  sortKey,
  completedLessonIds,
  enrolledDropletIds,
  searchValue,
  ratingsMap,
}: SortedDropletsGridProps) {

  // Use useMemo to sort droplets whenever the dependencies change
  const sortedDroplets = useMemo(() => {
    let sorted = [...droplets];
    if (sortKey) {
      const [field, direction] = sortKey.split(":");
      sorted.sort((a, b) => {
        let ratingA = ratingsMap.get(a.id);
        let ratingB = ratingsMap.get(b.id);
        if (!ratingA) {
          ratingA = 0
        }
        if (!ratingB) {
          ratingB = 0
        }
        if (field === "name") {
          return direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (field === "completion") {
          return direction === "asc"
            ? a.completionPercentage - b.completionPercentage
            : b.completionPercentage - a.completionPercentage;
        } else if (field === "rating") {
          return direction === "asc"
            ? ratingA - ratingB
            : ratingB - ratingA;
        }
        return 0;
      });
    }
    return sorted;
  }, [droplets, sortKey, ratingsMap]);


  if (!sortedDroplets || sortedDroplets.length === 0) {
    return (
      <Message className="mb-8 border border-dashed rounded-md border-slate-200">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          There are no Droplets that match &quot;{searchValue}&quot;.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <ul className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedDroplets.map((droplet) => (
        <DropletTile
          key={droplet.id}
          droplet={droplet}
          isEnrolled={enrolledDropletIds.includes(droplet.id)}
          completedLessonIds={completedLessonIds}
        />
      ))}
    </ul>
  );
}
