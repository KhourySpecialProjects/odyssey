"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/contexts/SearchContext";
import { DROPLET_FILTERS } from "@/lib/globals";

// Everything that narrows the list. `sort` and `contentType` are not here, so
// a reset keeps them. `page` goes too: a new list starts at page 1.
const RESET_PARAMS = [
  ...DROPLET_FILTERS.map((filter) => filter.name),
  "tags",
  "q",
  "page",
];
const FILTER_PARAMS = RESET_PARAMS.filter(
  (name) => name !== "q" && name !== "page",
);

/**
 * "Reset filters" for the Explore empty state (ODY-256). Renders nothing
 * unless a filter or search is active, so an empty catalog doesn't offer it.
 */
export function ResetFiltersButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useSearch();

  const hasFilters = FILTER_PARAMS.some((name) => searchParams?.has(name));
  if (!hasFilters && !searchQuery) return null;

  const reset = () => {
    const params = new URLSearchParams(searchParams ?? undefined);
    RESET_PARAMS.forEach((name) => params.delete(name));
    setSearchQuery("");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Button variant="outline" className="mt-4" onClick={reset}>
      Reset filters
    </Button>
  );
}
