"use client";

import { useSearchParams } from "next/navigation";
import { SortFilterItem, sorting } from "@/lib/globals";

/**
 * Resolves the live `?sort=` URL param to a sort key.
 *
 * Sort controls update the URL with `history.pushState` (no server render),
 * so client-side grids read the sort here instead of relying only on the
 * server-rendered prop. Sort controls always write the param once the user
 * picks an option, so a missing param means the server value is current.
 */
export function useSortKey(
  serverSortKey?: string,
  options: SortFilterItem[] = sorting,
): string | undefined {
  const sort = useSearchParams()?.get("sort");
  return (
    options.find((option) => option.slug === sort)?.sortKey ?? serverSortKey
  );
}
