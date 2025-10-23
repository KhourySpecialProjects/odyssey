"use client";

import { useMemo, useState } from "react";
import { Droplet, DueDate } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { PageNav } from "../ui/page-nav";
import { useSearch } from "@/contexts/SearchContext";

const ITEMS_PER_PAGE = 9;

interface EnrolledDropletsGridClientProps {
  dropletsWithCompletion: Array<Droplet & { completionPercentage: number }>;
  completedLessonIds: number[];
  isArchived?: boolean;
  isFavorited?: boolean;
  dueDates?: DueDate[];
  sortKey?: string;
  ratingsMap: Map<number, number>;
  tags?: string[] | string;
  type?: string | string[];
  focusArea?: string | string[];
}

export function EnrolledDropletsGridClient({
  dropletsWithCompletion,
  completedLessonIds,
  isArchived,
  isFavorited,
  dueDates,
  sortKey,
  ratingsMap,
  tags,
  type,
  focusArea,
}: EnrolledDropletsGridClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const sortedDroplets = useMemo(() => {
    const sorted = [...dropletsWithCompletion];
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
  }, [dropletsWithCompletion, sortKey, ratingsMap]);
  let newDrop = sortedDroplets;
  if (type) {
    newDrop = sortedDroplets.filter((drop) => drop.type === type);
  }
  if (focusArea) {
    newDrop = sortedDroplets.filter((drop) => drop.focusArea === focusArea);
  }
  if (tags) {
    const lowercaseTags = Array.isArray(tags)
      ? tags.map((tag) => tag.toLowerCase())
      : tags.split(",").map((tag) => tag.toLowerCase());
    newDrop = sortedDroplets.filter((drop) => {
      const hasMatchingTag = drop.tags?.some((tag) => {
        const tagName = tag.name.toLowerCase();
        const matches = lowercaseTags.includes(tagName);
        return matches;
      });
      return hasMatchingTag;
    });
  }
  const { searchQuery } = useSearch();
  const filteredDroplets = useMemo(() => {
    setCurrentPage(1);
    return newDrop.filter((droplet) =>
      droplet.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [newDrop, searchQuery]);

  const totalPages = Math.ceil(filteredDroplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompletedDroplets = filteredDroplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <>
      <ul className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedCompletedDroplets.map((droplet) => (
          <DropletTile
            key={droplet.id}
            droplet={droplet}
            isEnrolled={true}
            completedLessonIds={completedLessonIds}
            isArchived={isArchived}
            dueDate={
              dueDates?.find((dueDate) => dueDate.droplet?.id === droplet.id)
                ?.dueDate || ""
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
