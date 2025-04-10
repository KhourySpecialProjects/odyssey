"use client";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "./authorized-user";
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageNav } from "@/components/ui/page-nav";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { filter } from "lodash";

const ITEMS_PER_PAGE = 20;

export function AuthorizedUserClient({
  authorizedUsers,
}: {
  authorizedUsers: AuthorizedUser[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchItem] = useState("");
  const [searchResults, setSearchResults] = useState<AuthorizedUser[]>(authorizedUsers);

  const totalPages = Math.ceil(authorizedUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = searchResults.slice(
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


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setSearchItem(searchTerm);


    const filteredUsers = authorizedUsers.filter((user) =>
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!searchTerm.trim()) {
      setSearchResults(authorizedUsers);
      //return;
    } else {
      setSearchResults(filteredUsers);
    }
  }

  return (
    <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
      <div className="pb-4">
        <Input
          type="search"
          placeholder="Search..."
          className={cn(
            "w-full sm:w-[30%] flex items-center justify-center",
          )}
          value={searchTerm}
          onChange={(e) => handleInputChange(e)}
        />
      </div>
      {paginatedUsers.length > 0 ? (
        <>
          <ul className=" md:space-y-4 md:columns-2 md:gap-4">
            {paginatedUsers?.map((user) => (
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
