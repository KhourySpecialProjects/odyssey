"use client";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "./authorized-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 10;

export function AuthorizedUserClient({
  authorizedUsers,
}: {
  authorizedUsers: AuthorizedUser[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(authorizedUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = authorizedUsers.slice(
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
    <div className="p-4 mt-4 rounded-md bg-slate-100">
      {authorizedUsers.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {paginatedUsers.map((user) => (
              <AuthorizedUserBlock user={user} key={user.id} />
            ))}
          </ul>
          <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700"></hr>
          <div className="flex justify-end items-center mt-4 ">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`${currentPage === 1 ? "visibility: hidden" : "visibility: visible"}`}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`${currentPage === totalPages ? "visibility: hidden" : "visibility: visible"}`}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p>There are no authorized users.</p>
      )}
    </div>
  );
}
