"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSearch } from "@/contexts/SearchContext";
import { SearchBar } from "@/components/admin/search-bar";

export function Search() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useSearch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      // Filtering happens client-side, so only mirror the query into the URL:
      // skip no-op updates (e.g. on mount) and avoid a server render.
      const query = params.toString();
      if (query === searchParams.toString()) return;
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, pathname, searchParams]);

  return (
    <SearchBar
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full md:w-[560px]"
      inputClassName="h-9"
    />
  );
}
