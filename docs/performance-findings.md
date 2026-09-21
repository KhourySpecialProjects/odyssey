# Why Odyssey feels slow when switching pages

**Date:** 2026-09-21
**Branch:** `performance-testing`
**Audience:** anyone on the team — no engineering background needed

---

## The short version

Switching between pages in Odyssey is slow for six separate reasons. They stack
on top of each other, which is why the site feels sluggish rather than slow in
one specific place.

The single worst offender is the **Explore** page, which downloads about **1
megabyte of data every time you open it** — roughly 12 times more than any other
page — and **about 95% of that data is never shown to the user.**

The encouraging part: the three highest-value fixes are small and contained, and
they address the complaint people actually report ("clicking between tabs is
slow"). Only one of them has a downside a user could notice, and it's tunable.

Measured page-switch times:

| Page             | Time to appear |
| ---------------- | -------------- |
| My Content       | 0.16 sec       |
| Review           | 0.25 sec       |
| Groups Dashboard | 0.46 sec       |
| **Explore**      | **1.91 sec**   |

---

## How we measured this

We added temporary measurement tools that record, for every page load:

- how long the server took to assemble the page
- how many separate requests it made to the content database
- how much data was sent to the browser
- whether saved copies of data were reused or re-fetched

These tools are off by default and only run when explicitly switched on. None of
this affects the live site. Details are in
[`docs/agent/performance-probe.md`](agent/performance-probe.md).

**Two honest caveats.** All numbers were collected on a local development setup,
which is deliberately slower than the real site — so treat the timings as
_relative_ comparisons, not predictions of what students experience. And the
local database holds 85 droplets; the real one holds more, so the data sizes
below are floor estimates that grow with the content library.

---

## Problem 1 — Every page is rebuilt from scratch, every single time

**What happens:** When you click a tab, the server builds that page from
nothing. Click back to a page you visited ten seconds ago, and it builds the
whole thing again. Press the browser Back button — same thing.

The app has 56 addressable routes (pages plus a few internal endpoints).
**54 of them are rebuilt on every visit.** The only two exceptions are the site
icon and a social-media preview image — not real pages at all.

**Why:** Two causes. The site checks who you're logged in as in the page header,
which sits on every single page. That check makes the page personal, and
anything personal can't be pre-built and reused.

Separately, a setting in the app's configuration tells the browser to **throw
away each page the instant it's finished displaying it.** So there's nothing
kept in reserve to show you on a return visit.

**Analogy:** A restaurant that throws out your meal the moment you put your fork
down — then cooks it again from raw ingredients if you ask for another bite.

**Evidence:** The Review page needs 0.16 seconds of server work to deliver
15 kilobytes of content. That's a small, simple page, and it still pays the
rebuild cost. Every page pays it.

**This is the reason "clicking the same tab twice is slow."** There is no reason
the second click should cost anything, and right now it costs full price.

---

## Problem 2 — Explore requests ~20× more data than it displays

**What happens:** The Explore page shows a grid of droplet cards. Each card
displays a title, a short description, a difficulty badge, some tags, and a
star rating.

To draw those cards, the page requests **the complete contents of every
droplet** — every lesson, every paragraph of text, every quiz question, and
every multiple-choice answer option for all 85 droplets.

Then it throws almost all of it away.

**By the numbers:**

|                              | Data requested | Time   |
| ---------------------------- | -------------- | ------ |
| What Explore asks for now    | 858 KB         | 171 ms |
| What the cards actually need | ~40 KB         | ~35 ms |
| **Wasted**                   | **~818 KB**    | 136 ms |

That's roughly **20 times more data than necessary, and about 95% of it is never
read by anything.** The same pattern appears on the playlists request (7× too
much) at a smaller scale.

_(Our first measurement said 22.6×. On tracing every field we found two small
ones the cards genuinely use — which droplets a user has favorited, and who
authored each droplet — so the honest baseline is slightly higher than first
reported. Both are short lists of ID numbers; the conclusion is unchanged.)_

**Analogy:** Needing a list of book titles, and having the library ship you
every book — then reading only the spines.

**Why it costs twice:** The oversized data is pulled from the database _and_
forwarded all the way to the browser, because of how the page is wired
internally. So the user's device downloads and processes the full megabyte too.
On Explore, 0.26–0.77 seconds of the wait is the browser just receiving and
unpacking data it will never display.

**Evidence:** Data sent to the browser, per page:

| Page             | Sent to browser |
| ---------------- | --------------- |
| Review           | 15 KB           |
| Groups Dashboard | 17 KB           |
| Activity         | 7–51 KB         |
| My Content       | 73 KB           |
| Admin            | 86 KB           |
| **Explore**      | **865–907 KB**  |

Trimming the request would bring Explore to under 80 KB — in line with every
other page.

---

## Problem 3 — Explore asks for everything twice

**What happens:** Explore contains a search box. When the page opens, that
search box runs a piece of start-up code that updates the page's web address —
even though nobody has typed anything and nothing has changed.

Changing the address makes the page reload its data. So **every visit to Explore
costs two full requests instead of one.**

Combined with Problem 2, that's roughly **1.7 megabytes per click.**

**Analogy:** Walking into a room, then immediately walking out and back in
because a door sensor misfired.

**Side effect worth noting:** This also adds a bogus entry to your browser
history. Pressing Back on Explore likely returns you to Explore instead of the
previous page. If anyone has reported the Back button "not working," this is
probably why.

**Where it applies:** The Explore page and all five Activity tabs (Droplets,
Playlists, Voyages, Archived, Favorited). Other pages use a different search box
and aren't affected.

**Evidence:** We saw six data requests for Explore where only one navigation had
occurred. We separately confirmed the start-up code fires once per visit rather
than looping continuously.

---

## Problem 4 — One person clicking "favorite" slows the site for everyone

**What happens:** The app keeps saved copies of database results so it doesn't
have to re-ask for the same information constantly. Those copies are supposed to
last 15 minutes.

But the saved copy of "all droplets" is thrown away whenever _anything_ about
_any_ droplet changes — and that includes **one person clicking the heart icon
to favorite a droplet.** Seventeen different actions clear it, including
submitting a star rating.

So a single student favoriting a single droplet clears Explore's saved data
**for every user on the site.** The next person to open Explore pays the full
cost of rebuilding it.

**We tested this directly.** We loaded Explore repeatedly (fast, reusing saved
data), clicked one heart, then loaded it again:

|                       | Before the heart click | After          |
| --------------------- | ---------------------- | -------------- |
| Explore assembly time | 0.02 sec               | **0.57 sec**   |
| Database requests     | reused saved copies    | all re-fetched |

**24 times slower from one click.** On the real site, with many students
browsing and favoriting at once, this happens continuously — meaning the fast
path is the exception, not the rule.

We also found the re-fetches **pile up on each other**. Three requests arrived
before any had finished, so all three went to the database, and they got
progressively slower (0.04 → 0.16 → 0.30 sec) as they competed for the same
limited set of database connections.

**Analogy:** A shared shortcut that one person's minor action erases for
everybody, forcing the next hundred people to take the long way around.

**The good news:** Fixing Problem 2 largely neutralises this one. If rebuilding
Explore costs 0.03 seconds instead of 0.48, it stops mattering much how often
the saved copy is cleared. That lets us avoid rewiring the saved-copy system,
which is delicate work with real risk of showing people out-of-date content.

---

## Problem 5 — Requests wait in line instead of running side by side

**What happens:** Loading Explore requires six separate questions to the
database. Three of them don't depend on the other three in any way — but the
page is structured so the second group can't start until the _slowest_ member of
the first group has finished.

**Evidence:** On a measured load, the droplets request finished at the 0.50
second mark. The tags request started at 0.51 seconds — it had been sitting idle
the entire time, waiting for information it doesn't use.

Cost: roughly 0.09 seconds on this load, and it grows whenever the blocking
request is slow — so it makes bad situations worse.

**The same pattern on Activity:** Fetching a user's profile and then their
social connections happens strictly in sequence. The second request took **0.45
seconds to return 516 bytes of data** — a tiny result from a very complicated
question. Nothing about it needed to wait for the first request.

**Analogy:** Six people who could all queue at different counters, made to form
a single line behind whoever has the most complicated order.

---

## Problem 6 — The Activity feed loads after the page is already on screen

**What happens:** The Activity page appears, and _then_ goes back to the server
to fetch the feed contents. That second round trip took **1.7 seconds**, during
which the page looks loaded but the feed area is empty.

This work could happen while the page is being assembled, so the content arrives
with the page rather than well after it.

**Analogy:** A menu arriving at your table blank, with the waiter returning two
minutes later to write in the dishes.

---

## What we recommend, in order

| Priority | Fix                                             | Size      | What it improves                                   | What it costs                                 |
| -------- | ----------------------------------------------- | --------- | -------------------------------------------------- | --------------------------------------------- |
| 1        | Request only the data shown (Prob. 2)           | Contained | Cuts Explore's data by ~92%; neutralises Prob. 4   | Nothing users would notice                    |
| 2        | Stop discarding pages immediately (Prob. 1)     | 1 line    | Re-clicks and Back become instant, on all 54 pages | Content can be a few seconds out of date      |
| 3        | Stop Explore's duplicate request (Prob. 3)      | ~10 lines | Halves Explore and Activity; fixes Back            | Uncovers a separate bug that needs fixing too |
| 4        | Let independent requests run together (Prob. 5) | Mixed     | ~0.09 sec, more when the site is under load        | Half of it is harder than it first appeared   |
| 5        | Load the Activity feed with the page (Prob. 6)  | Moderate  | Removes a 1.7 sec gap on Activity                  | Feed filter buttons may become slower         |
| —        | Rewire the saved-copy system (Prob. 4)          | Large     | **Defer** — fix 1 makes this low-value             | Risk of showing people out-of-date content    |
| —        | Make pages reusable between visits (Prob. 1)    | Large     | The deepest fix; worth planning, not rushing       | A visible flicker in the page header          |

**Note on ordering:** trimming the data (Prob. 2) comes first rather than the
one-line change, because it is the only fix on this list with no user-visible
downside at all — and it makes fix 2's downside smaller.

### The tradeoffs in detail

**Fix 1 — Request only the data shown.** No functional tradeoff. The one real
cost is future fragility: right now the page over-requests so heavily that any
new field a developer wants is already present by accident. After trimming, a
developer adding a new detail to a droplet card has to explicitly ask for it, or
it will silently come through empty. That is the correct arrangement, but it
needs to be a documented decision rather than a quiet deletion.

Before doing this we must confirm nothing else relies on the removed data. We
have traced the droplet card and the droplet grid, and confirmed the one feature
that genuinely needs full droplet contents — "export as markdown" — already
fetches its own copy when clicked. The playlist and voyage grids still need the
same check.

**Fix 2 — Stop discarding pages immediately.** The site would keep each page in
the browser's memory briefly and reuse it, so returning to a page is instant.
The cost is that the reused page might be slightly out of date.

This matters less than it sounds. When _you_ change something — complete a
lesson, favorite a droplet, join a group — the app already knows to discard the
stored copy, so your own actions always show up right away. What can lag is
change caused by **someone else**: a friend accepting your request, or a new
droplet being published. Worst case, you'd see that a few seconds late.

We recommend starting at **10 seconds** rather than a longer window. Almost all
the benefit is in the first few seconds — the difference that matters is
"instant versus rebuilt from scratch," not "10 seconds versus a minute."

**Fix 3 — Stop Explore's duplicate request.** Fixing this exposes a second,
pre-existing bug: the search box never reads the search term out of the web
address. So sharing a link like `/explore?q=python` today silently drops the
search. The minimal performance fix would leave that broken in a new way — the
term would survive in the address bar but the box would appear empty and results
wouldn't filter. So the fix should cover both, which is why the estimate went
from ~3 lines to ~10.

Smaller side effect: typing a search would no longer add entries to your browser
history, so Back wouldn't step back through previous search terms. Since Back is
currently broken on Explore anyway, this is a net improvement — but it is a
change in behavior someone may notice.

**Fix 4 — Let independent requests run together.** This is really two fixes, and
we sized one of them wrong initially. The Explore half is straightforward. The
Activity half is not: the second request there needs an ID that only the first
request can provide, so making them run side by side means changing how stored
copies are labelled — which touches around six other places in the code. We
recommend doing the Explore half and leaving the Activity half.

A second consideration: making pages load their pieces independently can mean
more loading placeholders appearing and disappearing. Measurably faster, but
potentially busier to watch.

**Fix 5 — Load the Activity feed with the page.** The feed currently has
pagination, six filter buttons, and instant mark-as-read behavior. Moving it to
load with the page means that interactive state has to move into the web
address, and each filter click becomes a server request instead of an instant
local update. **This risks making the feed feel worse to interact with while
making it faster to load.** Worth doing, but as its own piece of work with
someone watching the interaction quality — not bundled in with the quick fixes.

**Deferred — rewire the saved-copy system.** The failure mode here is showing
people out-of-date content, which is a worse problem than being slow. It spans
17 places in the code and is easy to get subtly wrong. Fix 1 makes rebuilding
cheap enough that it stops mattering how often stored copies are cleared, so
this can wait indefinitely.

**Deferred — make pages reusable between visits.** The only item on this list
with a genuine user-experience cost. Pages currently can't be pre-built because
the header needs to know who is logged in. Removing that dependency means the
header briefly renders as though you're logged out before correcting itself —
a visible flicker or shift on every page load, traded for speed. That is a
design decision, not just an engineering one, and needs someone to weigh in on
whether the tradeoff is acceptable.

---

## One thing we looked into that turned out not to matter

The function that loads the tag list for filter dropdowns has a genuine coding
error — it ignores its own instructions and always requests more than asked.
Real bug, but the measured cost is **0.003 seconds and 3.6 KB.** Worth
correcting if someone is already working in that file; not worth its own task.

We're recording it here because it's a good example of a problem that looks
serious when reading the code and proves trivial when measured — which is why
we measured everything in this document rather than relying on inspection.

---

## What we still don't know

- **Real-world numbers.** Everything here is from a local setup with 85
  droplets. The proportions should hold, but the actual seconds students
  experience need measuring on the live site.
- **Whether the live site adds network delay.** There's reason to suspect the
  server's requests to the content database take a longer network path than
  necessary. We couldn't check — that configuration was outside what we could
  access.
- **How much of Problem 1 is browser-side.** We know pages are rebuilt every
  time. We haven't separated "server assembling the page" from "browser
  processing it" on the slower pages, which would tell us whether to focus on
  the server or on the amount of code sent to the browser.

---

## Appendix — baseline snapshot (before any fixes)

Recorded 2026-09-21 on the local Docker stack, 85 published droplets, Next.js
dev mode. Kept so "after" numbers can be compared against the same conditions.

**Reproduce with:** `PERF_PROBE=1` + `NEXT_PUBLIC_PERF_PROBE=1`, then
`docker compose exec frontend node scripts/measure-strapi-queries.mjs --runs 5`.
See [`docs/agent/performance-probe.md`](agent/performance-probe.md).

### Environment-independent (these hold anywhere)

| Metric                                       | Baseline    |
| -------------------------------------------- | ----------- |
| Explore data sent to browser                 | 865–907 KB  |
| Explore data fetched from Strapi             | 1000.3 KB   |
| — of which the droplets query                | 858.7 KB    |
| Droplets query, trimmed to fields used       | ~40 KB      |
| Droplets over-fetch ratio                    | ~20×        |
| Droplets payload never read by any component | ~95%        |
| Playlists over-fetch ratio                   | 7.0×        |
| Network requests per Explore click           | 2 (~1.7 MB) |
| Strapi calls per Explore render              | 7           |
| Longest serial chain, Explore                | 4 stages    |
| Longest serial chain, Activity               | 2 stages    |
| Routes rendered on every visit               | 54 of 56    |
| Mutations clearing the global droplets cache | 17          |

Explore vs. other pages, data sent to browser:

| Page             | Payload        | Multiple of Review |
| ---------------- | -------------- | ------------------ |
| Review           | 15.3 KB        | 1×                 |
| Groups Dashboard | 16.7 KB        | 1.1×               |
| Activity         | 7.4–51.2 KB    | 0.5–3.3×           |
| My Content       | 72.8 KB        | 4.8×               |
| Admin            | 85.8 KB        | 5.6×               |
| **Explore**      | **865–907 KB** | **~57×**           |

### Strapi query timings (median of 5, measured directly, no Next.js layer)

| Query               | Current | Trimmed | Delta   |
| ------------------- | ------- | ------- | ------- |
| Explore droplets    | 171 ms  | 34 ms   | −137 ms |
| Explore playlists   | 42 ms   | 23 ms   | −19 ms  |
| Tag filter dropdown | 12 ms   | 9 ms    | −3 ms   |

### Dev-mode timings (relative comparison only — do not quote as absolutes)

| Metric                                         | Baseline   |
| ---------------------------------------------- | ---------- |
| Click-to-paint, Explore                        | 1912 ms    |
| Click-to-paint, My Content                     | 159 ms     |
| Click-to-paint, Review                         | 247 ms     |
| Click-to-paint, Groups Dashboard               | 460 ms     |
| Explore transfer + parse in browser            | 256–768 ms |
| Explore server assembly, cached                | 23.7 ms    |
| Explore server assembly, after one heart click | 569.7 ms   |
| Activity feed second round trip                | 1701 ms    |
| Friendships query (516 bytes returned)         | 451.8 ms   |
| Groups query (16.7 KB returned)                | 412 ms     |

### Client JavaScript per route (from production build)

| Route                | First-load JS |
| -------------------- | ------------- |
| Lesson viewer        | 1.22 MB       |
| Presentation mode    | 1.06 MB       |
| Group detail         | 598 KB        |
| Shared by all routes | 103 KB        |

Not investigated in this document, but recorded because the lesson viewer is
the most-used page in the product.
