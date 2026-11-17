"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * The current page of a client-paginated grid, kept in the `?page=` URL param
 * so Back from a droplet returns to the page you left (ODY-865).
 *
 * Each page change is a history entry, written with `history.pushState` (no
 * server render), like the sort control. Page 1 is left out of the URL.
 * Controls that change the list (sort, filters, search, tabs) delete `page`
 * themselves, so nothing resets the page on mount.
 */
export function useUrlPage(): [number, (page: number) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = Number(searchParams?.get("page"));
  const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    if (next > 1) params.set("page", String(next));
    else params.delete("page");
    const query = params.toString();
    window.history.pushState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  };

  return [page, setPage];
}
