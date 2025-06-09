"use client";

import { useCallback, useState } from "react";
import { Droplet } from "@/types";
import { DropletBlock } from "./droplet-block";
import { PageNav } from "@/components/ui/page-nav";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";

const ITEMS_PER_PAGE = 10;

export function DropletClient({ droplets }: { droplets: Droplet[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchItem] = useState("");
  const [searchResults, setSearchResults] = useState<Droplet[]>(droplets);
  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDroplets = searchResults.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleInputChange = (value: string) => {
    const filteredDroplets = droplets.filter((droplet) =>
      droplet.name?.toLowerCase().includes(value.toLowerCase()),
    );
    if (!value.trim()) {
      setSearchResults(droplets);
    } else {
      setSearchResults(filteredDroplets);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => handleInputChange(value), 500),
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPage(1);
    setSearchItem(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <div className="mt-4 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
      <div className="pb-4">
        <Input
          type="search"
          placeholder="Search..."
          className={cn("flex w-full items-center justify-center sm:w-[30%]")}
          value={searchTerm}
          onChange={(e) => handleChange(e)}
        />
      </div>
      {paginatedDroplets.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
            {paginatedDroplets.map((d: Droplet) => (
              <DropletBlock droplet={d} key={d.id} />
            ))}
          </ul>
          <hr className="my-4 h-px border-0 bg-gray-200 dark:bg-gray-700"></hr>

          <PageNav
            currentPage={currentPage}
            updatePage={setCurrentPage}
            totalPages={totalPages}
          />
        </>
      ) : (
        <p>There are no created droplets.</p>
      )}
    </div>
  );
}
