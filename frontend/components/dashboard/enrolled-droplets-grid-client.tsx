"use client";

import { useMemo, useState } from "react";
import { Droplet, DueDate } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { PageNav } from "../ui/page-nav";
import { useSearch } from "@/contexts/SearchContext";

const ITEMS_PER_PAGE = 9;

export function EnrolledDropletsGridClient({
  dropletsWithCompletion,
  completedLessonIds,
  isArchived,
  dueDates,
  sortKey,
  ratingsMap,
  tags,
  type,
  focusArea,
}: {
  dropletsWithCompletion: Array<Droplet & { completionPercentage: number }>;
  completedLessonIds: number[];
  isArchived: boolean;
  dueDates?: DueDate[];
  sortKey?: string;

  ratingsMap: Map<number, number>;
  tags?: string[] | string;
  type?: string | string[];
  focusArea?: string | string[];
}) {
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
          if (dueDateA && dueDateB) {
            return direction === "asc"
              ? new Date(dueDateA).getTime() - new Date(dueDateB).getTime()
              : new Date(dueDateB).getTime() - new Date(dueDateA).getTime();
          } else if (dueDateA) {
            return -1; // a comes first
          } else if (dueDateB) {
            return 1; // b comes first
          } else {
            return 0; // no change in order
          }
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
