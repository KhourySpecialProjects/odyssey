"use client";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "./authorized-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageNav } from "@/components/ui/page-nav";

const ITEMS_PER_PAGE = 20;

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
    <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
      {authorizedUsers.length > 0 ? (
        <>
          <ul className=" md:space-y-4 md:columns-2 md:gap-4">
            {paginatedUsers.map((user) => (
              <AuthorizedUserBlock user={user} key={user.id} />
            ))}
          </ul>

          <PageNav
            currentPage={currentPage}
            updatePage={setCurrentPage}
            totalPages={totalPages}
          />
        </>
      ) : (
        <p>There are no authorized users.</p>
      )}
    </div>
  );
}
