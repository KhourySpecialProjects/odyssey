# Audit: ODY-447 — Creator page sort, filter, and search

Date: 2026-05-02
Files changed: 15 (1358 +, 110 -)
Branch: feature/ody-447-creator-page-sort-filter vs production

Investigations run: data flow, regression scan, performance, test coverage. Validator pass applied.

---

## Confirmed Issues

### Critical (must fix before merge)

_None._

### Warnings (should fix)

1. **`useMemo` dependency on `searchParams` object reference is brittle and silenced with `eslint-disable`.**
   File: `frontend/components/my-content/droplets-creator-grid.tsx:52-59` (also `playlists-creator-grid.tsx:36-42`, `voyages-creator-grid.tsx:39-45`).
   The memoized `filtered` list reads `filterParams` outside the dep array. The hook depends on `searchParams` (which Next.js returns as a new `ReadonlyURLSearchParams` instance on every navigation), so memoization is effectively per-render whenever ANY search param changes — even unrelated ones. Acceptable performance-wise on small client arrays, but the eslint-disable hides the real fix: derive the actual filter key string (e.g. `searchParams.toString()`) or pull individual `.get(key)` values into the dep list. Without that, the comment "stable via useMemo dep below" is misleading — the dep is the param-bag identity, not the filter values.

2. **Toolbar uses `throttleMs` instead of debouncing; spec asked for "debounced like /explore".**
   File: `frontend/components/my-content/my-content-toolbar.tsx:22`.
   `useQueryState("q", { throttleMs: 300 })` throttles URL updates (rate-limits to once per 300ms while typing). This is functionally close to debounce, and the validator confirmed it does prevent the previous re-fire bug, but the plan / `/explore` pattern uses true debounce (commit-after-quiet-period). Behavior diverges slightly: on a long type, throttle commits intermediate values; debounce only commits after the user stops. Low-impact, but worth a comment in the file or aligning with `/explore`'s `Search` component.

3. **`SortableItem` test type is unused / dead.**
   File: `frontend/__tests__/apply-sort-filter.test.ts:11-15`.
   Defined but only referenced by inline annotations that could just as well use `WithName & WithDates` from the source. Cosmetic only.

4. **`DROPLET_PARAM_KEYS` is exported but never imported anywhere.**
   File: `frontend/components/my-content/droplets-creator-grid.tsx:128`.
   Dead export. The canonical allowlist lives in `TAB_ALLOWED_PARAMS` inside `my-content-tabs.tsx`. Either delete the export or refactor both files to share a single source of truth so they cannot drift.

5. **`TAB_ALLOWED_PARAMS` and `clearFilters` lists duplicate the same param schema in 4 places.**
   Files: `my-content-tabs.tsx:31-44`, `droplets-creator-grid.tsx:62-73`, `playlists-creator-grid.tsx:46`, `voyages-creator-grid.tsx:49`.
   The allowlist for each tab is hand-maintained in two places (tab-switch cleanup AND clear-filters). Adding a new filter for, say, droplets requires editing two arrays in two files. Not a bug today, but a near-certain source of drift. Co-locate the param map in `sort-filter-options.ts` and import.

### Suggestions (nice to have)

6. **`applySort` returns original order for unknown sort key but still allocates a new array via `[...items].sort()`** — fine, just noting.

7. **No test asserts that tab counts remain unfiltered when filters are applied** — the spec calls this out explicitly (AC: "Existing tab counts continue to reflect the total items per tab (not the filtered count)"). The component test mocks the grids so this is structurally guaranteed by reading `droplets.length` directly, but a regression test would be cheap insurance.

8. **`my-content-toolbar.tsx` does not pull the per-tab `defaultValue` for `Sort` from anywhere shared** — it always passes `CREATOR_DEFAULT_SORT` regardless of `tab`. Currently fine (all three tabs share the same default), but the plan structured them as three lists per tab, so a future per-tab override would silently break.

---

## Disputed (validator concluded these are NOT issues)

- **"Suspense boundary wraps a client component that uses `useSearchParams` — needed for streaming, but `MyContentTabs` itself doesn't suspend."** Validator: Next.js 15 requires any client component reading `useSearchParams()` to be inside a `<Suspense>` for static rendering compatibility. The wrapper at `app/(general)/my-content/page.tsx:55` is correct and necessary, not redundant.

- **"`activeTab` derived from `useSearchParams` causes an extra render after `router.push`."** Validator: this is the explicit fix for the "tab switching not reactive" bug noted in the changeset summary. The previous local-state approach was the bug. Current pattern is correct.

- **"`applySort` mutates `items` because of `sorted.sort()`."** Validator: `sorted` is `[...items]`, a copy. Test on line 113 asserts non-mutation. Confirmed safe.

- **"`isHidden`/`isArchived` on filter predicates default to `false` but the schema may return `null`."** Validator: predicates use `?? false`, which handles both `undefined` and `null`. Confirmed safe.

- **"Empty input arrays will render the 'No items yet' empty state even if the user has active filters."** Validator: this is intentional and matches the spec — when there is genuinely nothing to filter, the "No items yet" CTA is correct; the "no matches" state only fires when the unfiltered array is non-empty.

- **"Adding `createdAt`/`updatedAt` to the `creation` populate may bloat the response."** Validator: these are scalar timestamps already on every Strapi entity, populated by default on the root entity and trivial in size. Adding them to the explicit `fields` list is a no-op for entities that already returned them and a fix for ones that didn't (the populate is field-restricted).

---

## Observations (no issues, but noted)

- **Backend types drift unrelated to feature.** `backend/types/generated/contentTypes.d.ts` shows in `git status` as modified but is NOT in the branch's commit set vs production. This is local auto-generated drift and not part of the changeset. Discard or ignore.

- **`useEffect` redirect on invisible-tab.** `my-content-tabs.tsx:75-82` correctly resets `tab` if the URL points at a hidden tab. Good defensive code.

- **No XSS / injection vectors introduced.** All filter values are read from URL params and compared against a fixed enum list of options before being passed into predicates; user-input only feeds into a substring match on `name`, which is rendered by existing tile components that already escape.

- **Auth boundary unchanged.** `app/(general)/my-content/page.tsx` still gates entry behind `isAuthorizedUserAdmin || isContentCreator || isAuthorizedUserFaculty`. Not weakened.

- **`fetchAPI` / cache tags untouched.** The feature is purely client-side. Spec said "no new Strapi requests, no schema changes, no new cache tags" — confirmed adhered to. The only request-layer change is adding `createdAt` / `updatedAt` to `USER_POPULATES.creation`'s `fields` list, which is consistent with the rule "only populate relations you actually render" since the new "Created on" date and the "Newest" / "Recently Updated" sort options need them.

- **`DropletTile` regression check.** The prop addition is opt-in (`showCreatedDate = false`). Of 11 call sites identified, only `droplets-creator-grid.tsx` opts in. The two cosmetic changes (`gap-2` on left container, `gap-1` on right container) affect every call site visually — small spacing tweak, low risk, no functional regression.

- **Tests pass.** `npx jest __tests__/apply-sort-filter.test.ts __tests__/my-content-tabs.test.tsx` → 36/36 passing.

- **Tailwind v3.4 / Next.js 15 / Strapi v4.22 constraints respected.** No `@theme`, no Document Service API, no `documentId`, no v5 flat responses. `cache` and `next` not both passed. All clear.

---

## Regression Risk

Low. `DropletTile` is the only widely-imported file changed; the prop is opt-in with a safe default and the only style changes are gap utilities. `USER_POPULATES.creation` adds two scalar fields to two field lists — strictly additive to the response shape.

## Test Coverage

Strong on the pure helpers (8 tests on `applySort`, 5 on `matchesSearch`, plus per-type filter coverage). Tab-switch param cleanup has 3 dedicated tests covering the three meaningful transitions. Untested: the per-grid `clearFilters` button behavior and the "no matches" empty state rendering. Not blockers — the helpers under those code paths are tested and the component wiring is straightforward.

---

## Verdict: APPROVE WITH CONDITIONS

The feature is functionally correct, well-tested, follows project patterns, and is low-risk to merge. Before merge, address Warnings 4 (delete dead export) and 5 (deduplicate the param allowlist) — both are 5-minute cleanups that prevent near-certain future drift. Warnings 1-3 can be deferred to a follow-up but should be tracked.

---

## Linear Tickets Created

(Created below as Bug tickets parented to ODY-447 where applicable.)
