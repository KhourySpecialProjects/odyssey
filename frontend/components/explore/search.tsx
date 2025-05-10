"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSearch } from "@/contexts/SearchContext";

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
    <div className="xs:max-w-sm flex items-center space-x-2">
      <Input
        type="search"
        placeholder="Search..."
        className="w-full md:w-[125px] lg:w-[300px]"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Button before={<SearchIcon />} className="dark:bg-slate-300">
        <span className="sr-only md:not-sr-only">Search</span>
      </Button>
    </div>
  );
}
