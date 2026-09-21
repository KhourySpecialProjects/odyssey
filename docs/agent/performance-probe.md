# Performance probe

Measurement instrumentation for diagnosing slow page transitions. Everything
here is **opt-in and off by default** — with the env flags unset, no probe code
runs and `fetchAPI` takes exactly the path it did before.

Added on the `performance-testing` branch to put numbers behind the static
analysis of why switching between Activity / Explore / Groups / Create / Review
feels slow.

## Turning it on

Set these flags:

```bash
PERF_PROBE=1              # server-side probe + Next.js fetch cache logging
NEXT_PUBLIC_PERF_PROBE=1  # client-side navigation timing (must reach browser)
```

Both go in the frontend env; `PERF_PROBE=1` also goes in the backend env to
enable the Strapi middleware.

### Running under Docker (the usual setup)

Both containers run `npm run dev`, so config changes need a container recreate
rather than a restart — Next.js does not hot-reload `next.config.mjs`.

```bash
# 1. Enable the flags. Both files are gitignored.
cat >> frontend/.docker.env <<'EOF'

# Performance probe — see docs/agent/performance-probe.md
PERF_PROBE=1
NEXT_PUBLIC_PERF_PROBE=1
EOF

cat >> backend/.docker.env <<'EOF'

# Performance probe — see docs/agent/performance-probe.md
PERF_PROBE=1
EOF

# 2. Recreate so env_file and next.config.mjs are re-read.
docker compose up -d --force-recreate frontend strapi

# 3. Optional: clear the Next data cache for a cold baseline. It lives in the
#    `frontend_cache` named volume, so it survives restarts.
docker compose exec frontend rm -rf .next/cache/fetch-cache

# 4. Watch both log streams.
docker compose logs -f frontend strapi

# 5. Navigate the app at localhost:3000 with the browser console open.

# 6. Query cost comparison. Needs no arguments in the container — the env
#    vars are already injected via env_file.
docker compose exec frontend node scripts/measure-strapi-queries.mjs --runs 5
```

Useful log filters:

```bash
docker compose logs frontend | grep -A 12 "PERF PROBE"   # just the summaries
docker compose logs frontend | grep -E "cache (hit|skip)" # just cache status
docker compose logs strapi   | grep "\[perf\]"            # just Strapi timings
docker compose logs --no-log-prefix frontend > /tmp/probe.log  # save to share
```

### Turning it back off

```bash
# Delete the PERF_PROBE lines from both .docker.env files, then:
docker compose up -d --force-recreate frontend strapi
```

## What each piece measures

| Probe                        | Where output lands | Answers                                              |
| ---------------------------- | ------------------ | ---------------------------------------------------- |
| `lib/perf/probe.ts`          | Next server stdout | Per-page Strapi call count, waterfall depth, payload |
| `NavTimingProbe`             | Browser console    | RSC payload size + server time per navigation        |
| Next `logging.fetches`       | Next server stdout | Authoritative data-cache hit/miss per fetch          |
| Strapi `request-timing`      | Strapi stdout      | Time spent inside Strapi vs. time on the wire        |
| `measure-strapi-queries.mjs` | Terminal           | Cost of current queries vs. trimmed equivalents      |

### 1. Server probe — `frontend/lib/perf/probe.ts`

Hooks into `fetchAPI()` in `lib/utils.ts`. Records duration, response bytes,
cache mode, and cache tags for every Strapi call, keyed to a single server
request via React `cache()`.

`<PerfProbe />` in the root layout flushes the summary using Next 15's `after()`
— the only hook that reliably runs _after_ every Server Component in the tree
has resolved. (Server Components render concurrently, so a logger placed last in
the JSX would fire too early.)

Output per navigation:

```
┌─ PERF PROBE  /explore
│  7 Strapi calls · serial depth 4 · 4/7 likely cache hits
│  wall 23.7ms · summed 32.4ms · payload 1000.3KB
│  fetch/total ms      bytes    offset          path
│  2/6.6ms      858.7KB   @16→22.5        /droplets                 q=1102  CACHED? revalidate=900 tags=droplets
│  8.5/8.5ms    116.2KB   @16.6→25.1      /playlists                q=388   NETWORK revalidate=900 tags=playlists
│  ...
└─
```

Read it as:

- **serial depth** — length of the longest non-overlapping chain. Equal to the
  call count means a pure waterfall; 1 means everything ran in parallel. This is
  the single most useful number for spotting sequential `await`s.
- **wall vs. summed** — a large gap means calls overlapped (good). `wall ≈
summed` confirms serialization.
- **`@start→end`** — offsets in ms from the first call, so you can see by eye
  which call blocked which.
- **fetch/total ms** — time awaiting `fetch()` vs. that plus reading the body. A
  small fetch time with a much larger total means the payload itself is the cost,
  not the query. These are reported separately because reading a large body
  takes several ms even on a cache hit, which made a combined figure
  misclassify exactly the big responses worth investigating.
- **likely cache hit** — a _timing heuristic_ on the fetch half only (under
  5ms). The Next.js data cache does not expose hit/miss on the response object.
  Trust the `logging.fetches` output over this column.

`setProbeLabel()` is called at the top of the six pages under investigation so
the summary names the route. Add it to other pages as needed — it is a no-op
when the probe is off.

### 2. Navigation probe — `frontend/components/debug/nav-timing-probe.tsx`

Client component in the root layout. Logs two things per transition:

```
[nav] rsc /explore  684ms  1832.4KB  (ttfb 602ms)
[nav] /activity → /explore  click→paint 731ms
```

- `rsc` comes from a `PerformanceObserver` on resource entries matching
  `_rsc=`. High TTFB with a small payload points at server render time; a large
  payload points at over-fetch being serialized into the Flight stream.
- `click→paint` is stamped from a capture-phase click listener on internal
  anchors through to the second animation frame after the pathname changes.
  Navigations without a preceding click (back/forward, `router.push`) are
  labelled `history→paint` and measure from the pathname change only.

### 3. Next.js fetch cache logging

`next.config.mjs` enables `logging.fetches.fullUrl` when `PERF_PROBE=1`. Next
then annotates each server fetch with `(cache hit)` / `(cache skip)` and the
reason. This is the authoritative check on whether the `revalidate: 900` tags on
the request functions are actually serving traffic. Dev server only — Next
ignores this config in production builds.

### 4. Strapi timing — `backend/src/middlewares/request-timing.ts`

Registered first in `config/middlewares.ts` so its timing wraps everything else.

```
[perf] 389.2ms 3894.1KB 200 GET /api/droplets q=1847
```

Comparing this against the same call's duration in the server probe isolates
Strapi/DB work from transport. A large gap in deployed environments would
support the theory that server-side fetches are leaving the VPC and coming back
in over the public ALB.

### 5. Query comparison script

```bash
cd frontend
node scripts/measure-strapi-queries.mjs            # 3 runs each
node scripts/measure-strapi-queries.mjs --runs 5
node scripts/measure-strapi-queries.mjs --env .docker.env
```

Read-only (GETs only). Bypasses Next entirely, so it isolates raw query cost
from caching. For each of three queries it runs the current version and a
trimmed version containing only the fields the UI actually renders:

- **Explore droplets** — current populates all six dynamic-zone block types
  including quiz questions and answer options; trimmed matches what
  `droplet-tile.tsx` reads.
- **Explore playlists** — current populates `droplets` with no `fields`, pulling
  every column including the `overview` CKEditor HTML.
- **Tag dropdown** — `getTags()` hardcodes a `droplets` join and ignores its own
  `populate` argument, so `/new/droplet` and the Activity droplets tab both pay
  for it.

Output ends with an over-fetch ratio per query.

**Run it against an environment with production-like data volume.** A
near-empty local database will understate the gap, because the cost is
proportional to lesson and block count.

## Testing the cache-churn hypothesis

The theory is that `revalidateTag(CACHE_TAGS.droplets)` — called from 17 places
including `favoriteDroplet` — wipes the Explore cache globally, so under real
traffic the 900s TTL is rarely reached.

A single developer clicking around will **not** reproduce this, because nothing
is invalidating the tag. Force it:

```bash
# 1. Cold baseline.
docker compose exec frontend rm -rf .next/cache/fetch-cache
```

2. Navigate to `/explore` **using in-app links only**. Never press reload or
   Cmd+R during this test: the browser sends `cache-control: no-cache`, Next
   honours it, and every fetch reports `cache skip` regardless of what the app
   is doing. Watch for `Cache skipped reason: (cache-control: no-cache (hard
refresh))` in the log — it means the run is invalid.
3. Click away to another tab, then back to `/explore`. This is the warm read.
4. Click the heart icon on any droplet tile. `favoriteDroplet` calls
   `revalidateTag`, and Next automatically re-renders the current route, so
   this click _is_ the post-invalidation load — no extra navigation needed.

```bash
# 5. One line per /explore render, in order.
docker compose logs --since 10m --no-log-prefix frontend \
  | grep "api/droplets" | grep -oE "[0-9]+ms \(cache [a-z]+\)"

# ...and the matching probe summaries.
docker compose logs --since 10m --no-log-prefix frontend \
  | grep -A 14 "PERF PROBE  /explore"
```

`--since` takes a Go duration (`10m`, `1h30m`) or a full RFC3339 timestamp
(`2026-09-21T19:43:08Z`). A bare `HH:MM:SS` is rejected.

Expected shape:

```
318ms (cache skip)   ← step 2, cold
2ms   (cache hit)    ← step 3, warm
???                  ← step 4, the answer
```

If step 4 reads `cache skip`, the global invalidation is confirmed — and in
production it fires continuously, so step 3's fast path is the exception. If it
reads `cache hit`, the hypothesis is wrong.

If step 3 does **not** show a cache hit, something else is defeating the cache
and the run is inconclusive — that is a more interesting finding than the one
being tested.

## Overhead

When `PERF_PROBE` is unset:

- `fetchAPI` calls `response.json()` exactly as before.
- Probe functions early-return before allocating anything.
- `NavTimingProbe` registers no listeners and returns `null`.
- The Strapi middleware calls `next()` immediately.

When enabled, `fetchAPI` reads the body as text and calls `JSON.parse` itself so
it can measure real uncompressed payload size. That costs an extra string
allocation per call — fine for local diagnosis, which is why the flag exists.

## Removing it

The probe is self-contained. To strip it:

- Delete `frontend/lib/perf/`, `frontend/components/debug/perf-probe.tsx`,
  `frontend/components/debug/nav-timing-probe.tsx`,
  `frontend/scripts/measure-strapi-queries.mjs`,
  `backend/src/middlewares/request-timing.ts`, and this file.
- Revert the probe block in `fetchAPI` (`lib/utils.ts`), the two mounts in
  `app/layout.tsx`, the `logging` block in `next.config.mjs`, the
  `global::request-timing` entry in `backend/config/middlewares.ts`, and the
  `setProbeLabel` calls in the six instrumented pages.
