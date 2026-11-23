"use client";

import { useSearchParams } from "next/navigation";
import { SearchProvider } from "@/contexts/SearchContext";

/**
 * Explore's search, started from the live `?q=` so Back from a droplet keeps
 * it (ODY-865). Read on the client: `Search` writes `q` with replaceState, so
 * the server-rendered page that Back restores predates the query.
 */
export function ExploreSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const query = useSearchParams()?.get("q") ?? "";
  return <SearchProvider initialQuery={query}>{children}</SearchProvider>;
}
