"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthorizedUser, Droplet, DueDate } from "@/types";
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
  difficulty?: string | string[];
  currentUser?: AuthorizedUser;
  isAdmin?: boolean;
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
  difficulty,
  currentUser,
  isAdmin,
}: EnrolledDropletsGridClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { searchQuery } = useSearch();

  // Step 1: Sort droplets
  const sortedDroplets = useMemo(() => {
    const sorted = [...dropletsWithCompletion];
    if (sortKey) {
      const [field, direction] = sortKey.split(":");
      sorted.sort((a, b) => {
        const ratingA = ratingsMap.get(a.id) || 0;
        const ratingB = ratingsMap.get(b.id) || 0;

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

          const isCompleteA = a.completionPercentage === 100;
          const isCompleteB = b.completionPercentage === 100;

          const getGroup = (
            isComplete: boolean,
            hasDueDate: boolean,
          ): number => {
            if (!isComplete && hasDueDate) return 1;
            if (isComplete) return 2;
            return 3;
          };

          const groupA = getGroup(isCompleteA, !!dueDateA);
          const groupB = getGroup(isCompleteB, !!dueDateB);

          if (groupA !== groupB) {
            return groupA - groupB;
          }

          if (dueDateA && dueDateB) {
            return direction === "asc"
              ? new Date(dueDateA).getTime() - new Date(dueDateB).getTime()
              : new Date(dueDateB).getTime() - new Date(dueDateA).getTime();
          }

          if (dueDateA) return -1;
          if (dueDateB) return 1;

          return 0;
        }
        return 0;
      });
    }
    return sorted;
  }, [dropletsWithCompletion, sortKey, ratingsMap, dueDates]);

  // Step 2: Apply filters (type, focusArea, tags, search)
  const filteredDroplets = useMemo(() => {
    let filtered = sortedDroplets;

    // Filter by type
    if (type) {
      filtered = filtered.filter((drop) => drop.type === type);
    }

    // Filter by focus area
    if (focusArea) {
      filtered = filtered.filter((drop) => drop.focusArea === focusArea);
    }

    // Filter by difficulty
    if (difficulty) {
      const diffValues = Array.isArray(difficulty)
        ? difficulty
        : difficulty.split(",");
      filtered = filtered.filter(
        (drop) => drop.difficulty && diffValues.includes(drop.difficulty),
      );
    }

    // Filter by tags
    if (tags) {
      const lowercaseTags = Array.isArray(tags)
        ? tags.map((tag) => tag.toLowerCase())
        : tags.split(",").map((tag) => tag.toLowerCase());
      filtered = filtered.filter((drop) => {
        return drop.tags?.some((tag) =>
          lowercaseTags.includes(tag.name.toLowerCase()),
        );
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((droplet) =>
        droplet.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filtered;
  }, [sortedDroplets, type, focusArea, difficulty, tags, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [type, focusArea, difficulty, tags, searchQuery]);

  // Step 3: Paginate
  const totalPages = Math.ceil(filteredDroplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDroplets = filteredDroplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <>
      <ul className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedDroplets.map((droplet) => (
          <DropletTile
            key={droplet.id}
            droplet={droplet}
            isEnrolled={true}
            completedLessonIds={completedLessonIds}
            isArchived={isArchived}
            isFavorited={
              isFavorited !== undefined
                ? isFavorited
                : droplet.usersFavorited?.some(
                    (user) => user.id === currentUser?.id,
                  )
            }
            dueDate={
              dueDates?.find((dueDate) => dueDate.droplet?.id === droplet.id)
                ?.dueDate || ""
            }
            isAdmin={isAdmin}
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
