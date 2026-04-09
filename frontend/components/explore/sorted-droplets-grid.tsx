"use client";

import { Droplet, DueDate } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { useMemo, useState } from "react";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { useSearch } from "@/contexts/SearchContext";
import { PageNav } from "../ui/page-nav";

interface SortedDropletsGridProps {
  droplets: Array<Droplet & { completionPercentage: number }>;
  sortKey?: string;
  completedLessonIds: number[];
  enrolledDropletIds: number[];
  searchValue?: string;
  ratingsMap: Map<number, number>;
  dueDates: DueDate[];
  isAdmin?: boolean;
  archivedDropletIds?: number[];
  currentUserId?: number;
}

export function SortedDropletsGrid({
  droplets,
  sortKey,
  completedLessonIds,
  enrolledDropletIds,
  searchValue,
  ratingsMap,
  dueDates,
  isAdmin,
  archivedDropletIds = [],
  currentUserId,
}: SortedDropletsGridProps) {
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  const sortedDroplets = useMemo(() => {
    const sorted = [...droplets];
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
        } else if (field === "duedate") {
          const dueDateA = dueDates?.find(
            (dueDate) => dueDate.droplet?.id === a.id,
          )?.dueDate;
          const dueDateB = dueDates?.find(
            (dueDate) => dueDate.droplet?.id === b.id,
          )?.dueDate;

          // Determine completion status (100% = complete)
          const isCompleteA = a.completionPercentage === 100;
          const isCompleteB = b.completionPercentage === 100;

          // Group 1: Incomplete with due dates
          // Group 2: Complete (with or without due dates)
          // Group 3: Incomplete without due dates

          const getGroup = (
            isComplete: boolean,
            hasDueDate: boolean,
          ): number => {
            if (!isComplete && hasDueDate) return 1; // Incomplete with due date
            if (isComplete) return 2; // Complete
            return 3; // Incomplete without due date
          };

          const groupA = getGroup(isCompleteA, !!dueDateA);
          const groupB = getGroup(isCompleteB, !!dueDateB);

          // First, sort by group
          if (groupA !== groupB) {
            return groupA - groupB;
          }

          // Within the same group, sort by due date if both have one
          if (dueDateA && dueDateB) {
            return direction === "asc"
              ? new Date(dueDateA).getTime() - new Date(dueDateB).getTime()
              : new Date(dueDateB).getTime() - new Date(dueDateA).getTime();
          }

          // If only one has a due date (within the same group)
          if (dueDateA) return -1;
          if (dueDateB) return 1;

          return 0; // no change in order
        }
        return 0;
      });
    }
    return sorted;
  }, [droplets, sortKey, ratingsMap]);

  const { searchQuery } = useSearch();

  const filteredDroplets = useMemo(() => {
    setCurrentPage(1);
    return sortedDroplets.filter((droplet) =>
      droplet.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [sortedDroplets, searchQuery]);

  const totalPages = Math.ceil(filteredDroplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedDroplets = filteredDroplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  if (!filteredDroplets || filteredDroplets.length === 0) {
    return (
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          {searchValue
            ? `There are no Droplets that match "${searchValue}".`
            : "There are no droplets that match those filters."}
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
            isAdmin={isAdmin}
            isArchived={archivedDropletIds.includes(droplet.id)}
            isFavorited={
              currentUserId
                ? droplet.usersFavorited?.some(
                    (user) => user.id === currentUserId,
                  ) ?? false
                : false
            }
          />
        ))}
      </ul>
      <PageNav
        currentPage={currentPage}
        updatePage={setCurrentPage}
        totalPages={totalPages}
      />
    </>
  );
}
