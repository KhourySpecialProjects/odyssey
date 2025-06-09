"use client";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "./authorized-user";
import { useCallback, useState } from "react";
import { PageNav } from "@/components/ui/page-nav";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";

const ITEMS_PER_PAGE = 20;

export function AuthorizedUserClient({
  authorizedUsers,
}: {
  authorizedUsers: AuthorizedUser[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchItem] = useState("");
  const [searchResults, setSearchResults] =
    useState<AuthorizedUser[]>(authorizedUsers);

  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = searchResults.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleInputChange = (value: string) => {
    const filteredUsers = authorizedUsers.filter(
      (user) =>
        user.lastName?.toLowerCase().includes(value.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(value.toLowerCase()) ||
        user.email?.toLowerCase().includes(value.toLowerCase()),
    );
    if (!value.trim()) {
      setSearchResults(authorizedUsers);
    } else {
      setSearchResults(filteredUsers);
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
      {paginatedUsers.length > 0 ? (
        <>
          <ul className="md:columns-2 md:gap-4 md:space-y-4">
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
