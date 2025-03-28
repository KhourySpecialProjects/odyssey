"use client";

import { useState } from "react";
import { AnnouncementType, Announcement } from "@/types";
import { FeedBlock } from "./feed-block";
import { Button } from "../ui/button";

const ITEMS_PER_PAGE = 20;

export function FeedClient({
  selectedRoles,
  announcements,
}: {
  selectedRoles: AnnouncementType[];
  announcements: Announcement[];
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAnnouncements = announcements.filter((post) =>
    selectedRoles.includes(post.type),
  );

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAnnouncements = filteredAnnouncements.slice(
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
    <section className="">
      <div className="rounded-md">
        {paginatedAnnouncements.length > 0 ? (
          <>
            <ul className="md:w-[80%] md:mx-auto grid gap-4 grid-cols-1 auto-rows-fr">
              {paginatedAnnouncements.map((post) => (
                <FeedBlock key={post.id} announcement={post} />
              ))}
            </ul>
            {totalPages != 1 && (
              <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700"></hr>
            )}
            <div className="flex justify-end items-center mt-4 pb-4">
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
        ) : (
          <p className="text-center text-slate-500">No announcements found</p>
        )}
      </div>
    </section>
  );
}
