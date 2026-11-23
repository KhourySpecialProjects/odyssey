# Back restores server props from before a client-side URL change

Date: 2026-11-02
Author: Awad Buisir + Claude (ODY-865)
Status: new

## What we learned

- A param written with `history.pushState` or `replaceState` (Explore's sort, search and page) changes the URL without a server render.
- When the user leaves and presses Back, Next.js restores the page from its client router cache. The server component's `searchParams` and the props it passed down are from the last server render, before that URL change.
- `useSearchParams()` in a client component does return the restored URL.
- So read a client-written param on the client. Explore's `?q=` broke this way: the page passed its server `q` to `SearchProvider`, and Back came back with an empty search box. `ExploreSearchProvider` reads it with `useSearchParams` instead.

## Why it matters

Jest renders server components with fresh `searchParams` and has no router cache, so it can't see this. Only a browser run of leave-then-Back showed it.

## Evidence

- `frontend/components/explore/explore-search-provider.tsx`, `frontend/hooks/use-url-page.ts`
- `docs/plans/ODY-865.md` (D4)
