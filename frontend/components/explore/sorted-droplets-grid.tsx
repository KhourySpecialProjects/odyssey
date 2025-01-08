"use client";

import { Droplet } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { useEffect, useState, useMemo } from "react";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";

interface SortedDropletsGridProps {
  droplets: Array<Droplet & { completionPercentage: number }>;
  sortKey?: string;
  completedLessonIds: number[];
  enrolledDropletIds: number[];
  searchValue?: string;
}

export function SortedDropletsGrid({
  droplets,
  sortKey,
  completedLessonIds,
  enrolledDropletIds,
  searchValue,
}: SortedDropletsGridProps) {
  // Use useMemo to sort droplets whenever the dependencies change
  const sortedDroplets = useMemo(() => {
    let sorted = [...droplets];
    if (sortKey) {
      const [field, direction] = sortKey.split(":");
      sorted.sort((a, b) => {
        if (field === "name") {
          return direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (field === "completion") {
          return direction === "asc"
            ? a.completionPercentage - b.completionPercentage
            : b.completionPercentage - a.completionPercentage;
        }
        return 0;
      });
    }
    return sorted;
  }, [droplets, sortKey]);

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
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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