"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Page number of a paginated list, kept in `?page=` so it survives opening an
 * item and coming back, and reloads. Like the search box, it only rewrites
 * the URL with the history API, so changing page doesn't render the server.
 *
 * `resetKey` is the current result list: when it changes (new search, sort
 * or filters) the list goes back to page 1. The page is capped at
 * `totalPages`.
 */
export function useUrlPage(
  totalPages: number,
  resetKey: unknown,
): [number, (page: number) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPageState] = useState(() => {
    const requested = Number.parseInt(searchParams?.get("page") ?? "", 10);
    return requested > 1 ? requested : 1;
  });

  const setPage = useCallback(
    (next: number) => {
      setPageState(next);
      const params = new URLSearchParams(window.location.search);
      if (next > 1) params.set("page", String(next));
      else params.delete("page");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  // Compare with the last key rather than skipping the first run, so React's
  // development double-run of effects doesn't reset a page from the URL
  const lastResetKey = useRef(resetKey);
  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    setPage(1);
  }, [resetKey, setPage]);

  return [Math.min(page, Math.max(totalPages, 1)), setPage];
}
