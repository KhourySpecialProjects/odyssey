"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Droplet, DueDate, Enrollment } from "@/types";
import { DropletTile } from "../droplets/droplet-tile";

const ITEMS_PER_PAGE = 9;

export function EnrolledDropletsGridClient({
  dropletsWithCompletion,
  completedLessonIds,
  isArchived,
  enrollments,
  dueDates
}: {
  dropletsWithCompletion: Droplet[];
  completedLessonIds: number[];
  isArchived: boolean;
  enrollments: Enrollment[];
  dueDates?: DueDate[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(dropletsWithCompletion.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompletedDroplets = dropletsWithCompletion.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

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
            dueDate={dueDates?.find(
              (dueDate) => dueDate.droplet?.id === droplet.id,
            )?.dueDate || ""}
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
