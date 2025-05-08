"use client";

import { useState } from "react";
import { Droplet, DueDate } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";
import { PageNav } from "../ui/page-nav";

const ITEMS_PER_PAGE = 9;

export function EnrolledDropletsGridClient({
  dropletsWithCompletion,
  completedLessonIds,
  isArchived,
  dueDates,
}: {
  dropletsWithCompletion: Droplet[];
  completedLessonIds: number[];
  isArchived: boolean;
  dueDates?: DueDate[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(dropletsWithCompletion.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompletedDroplets = dropletsWithCompletion.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <>
      <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
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
