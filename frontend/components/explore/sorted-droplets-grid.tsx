"use client";

import { Droplet, DueDate, Enrollment } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { useMemo, useState } from "react";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Button } from "../ui/button";

interface SortedDropletsGridProps {
  droplets: Array<Droplet & { completionPercentage: number }>;
  sortKey?: string;
  completedLessonIds: number[];
  enrolledDropletIds: number[];
  searchValue?: string;
  ratingsMap: Map<number, number>;
  dueDates: DueDate[];
}

export function SortedDropletsGrid({
  droplets,
  sortKey,
  completedLessonIds,
  enrolledDropletIds,
  searchValue,
  ratingsMap,
  dueDates,
}: SortedDropletsGridProps) {
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(droplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Use useMemo to sort droplets whenever the dependencies change
  const sortedDroplets = useMemo(() => {
    let sorted = [...droplets];
    if (sortKey) {
      const [field, direction] = sortKey.split(":");
      sorted.sort((a, b) => {
        let ratingA = ratingsMap.get(a.id);
        let ratingB = ratingsMap.get(b.id);
        if (!ratingA) {
          ratingA = 0;
        }
        if (!ratingB) {
          ratingB = 0;
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
          return direction === "asc" ? ratingA - ratingB : ratingB - ratingA;
        }
        return 0;
      });
    }
    return sorted;
  }, [droplets, sortKey, ratingsMap]);

  const paginatedDroplets = sortedDroplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  if (!sortedDroplets || sortedDroplets.length === 0) {
    return (
      <Message className="mb-8 border border-dashed rounded-md border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          {searchValue ? `There are no Droplets that match "${searchValue}".` : "There are no droplets that match those filters."}
        </MessageDescription>
      </Message>
    );
  }

  return (
    <>
      <ul className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedDroplets.map((droplet) => (
          <DropletTile
            key={droplet.id}
            droplet={droplet}
            isEnrolled={enrolledDropletIds.includes(droplet.id)}
            completedLessonIds={completedLessonIds}
            dueDate={
              dueDates?.find((dueDate) => dueDate.droplet?.id === droplet.id)
                ?.dueDate || ""
            }
          />
        ))}
      </ul>
      <div className="flex justify-end items-center mt-4 ">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`${currentPage === 1 ? "visibility: hidden" : "visibility: visible"} dark:bg-slate-300 dark:text-black`}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`${currentPage === totalPages ? "visibility: hidden" : "visibility: visible"} dark:bg-slate-300 dark:text-black`}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
