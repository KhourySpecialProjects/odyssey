"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSearch } from "@/contexts/SearchContext";
import { SearchBar } from "@/components/admin/search-bar";

export function Search() {
  const router = useRouter();
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
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, pathname, router, searchParams]);

  return (
    <SearchBar
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full md:w-[560px]"
      inputClassName="h-9 text-sm bg-white dark:bg-slate-800"
      iconClassName="h-4 w-4"
    />
  );
}
