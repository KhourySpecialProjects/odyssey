"use client";

import { ChangeEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Group } from "@/types";
import { GroupBlock } from "./group-block";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

const ITEMS_PER_PAGE = 10;

export function GroupClient({ groups }: { groups: Group[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchItem] = useState("");
  const [searchResults, setSearchResults] = useState<Group[]>(groups);
  const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGroups = searchResults.slice(
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

  const handleInputChange = (value: string) => {
    const filteredGroups = groups.filter((group) =>
      group.groupName?.toLowerCase().includes(value.toLowerCase()),
    );
    if (!value.trim()) {
      setSearchResults(groups);
    } else {
      setSearchResults(filteredGroups);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => handleInputChange(value), 500),
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchItem(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
      <div className="pb-4">
        <Input
          type="search"
          placeholder="Search..."
          className={cn("w-full sm:w-[30%] flex items-center justify-center")}
          value={searchTerm}
          onChange={(e) => handleChange(e)}
        />
      </div>
      {paginatedGroups.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {paginatedGroups.map((g: Group) => (
              <GroupBlock group={g} key={g.id} />
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
        <p>There are no created groups.</p>
      )}
    </div>
  );
}
