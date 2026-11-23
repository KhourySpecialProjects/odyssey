# Next.js 16 migration plan (Dependabot #1350)

Project P-ODY-137 ("Odyssey Next.js + Strapi Update"). Written 2026-11-17 against `origin/develop` at `31dd479c`. This is a plan only; no app code has changed.

## Summary

- **Why #1350 fails:** the build stops at type checking. Next 16 makes the second argument of `revalidateTag()` required, and we call it with one argument 225 times in 24 files, so `next build` reports 224 `TS2554: Expected 2 arguments, but got 1` errors. One test mock also fails because `AppRouterInstance` gained a required `bfcacheId` field. Nothing else in the build failed.
- **Is it big?** No. In a scratch copy, three shims were enough to make `next build` pass on 16.4.6 with Turbopack: a second argument on every `revalidateTag()` call, removing the `eslint` key from `next.config.mjs`, and fixing that one mock. Every app page already awaits `params`, `searchParams`, `cookies()` and `headers()`, so the async request API change from Next 15 is already done.
- **The trap:** the "obvious" fix, `revalidateTag(tag, "max")`, changes behaviour. With `"max"` the tag becomes stale-while-revalidate, and a Server Action no longer reads its own writes: a learner who enrolls or finishes a lesson would see the old state until a second refresh. The correct fix is `revalidateTag(tag, { expire: 0 })`. It expires the tag right away and still marks the action as having revalidated, exactly like today (checked in `next/dist/server/web/spec-extension/revalidate.js`). Unlike `updateTag()`, it also works in Route Handlers and `after()`, which we use.
- **Other work:** `next lint` is gone, so lint must move to the ESLint 9 CLI with a flat config. `eslint-config-next@16` brings the React Compiler rules in `eslint-plugin-react-hooks` v7, which add 104 errors in 58 files in `app/`, `components/` and `lib/`. `middleware.ts` still works but is deprecated in favour of `proxy.ts`.
- **Size:** about 1,300 changed code lines in total, mostly one-line mechanical edits, split into five PRs of under 1,000 lines each.
- **Recommendation:** migrate now, as part of P-ODY-137, starting with two prep PRs that are safe on Next 15. Keep #1350 open until the bump PR is ready, then close it in favour of that PR. Add a Dependabot ignore rule for `next` and `eslint-config-next` semver-major updates so majors are always planned, and group the two packages so they move together.

## 1. Why the build fails today

Job `frontend-build` (check run 134106118178) on head `cbf557e1` runs `npm run build`. Next prints warnings, then compiles successfully in 31 s, then fails in "Running TypeScript":

```
lib/actions.ts(113,7): error TS2554: Expected 2 arguments, but got 1.
... 223 more TS2554 errors, all on revalidateTag() calls ...
tests/components/draft/add-lesson.test.tsx(161,44): error TS2345: Argument of type '{ push: jest.Mock ... }'
  is not assignable to parameter of type 'AppRouterInstance'.  (missing 'bfcacheId')
```

The new signature is `revalidateTag(tag: string, profile: string | { expire?: number })`. At runtime the one-argument form still works (it logs a deprecation warning and expires immediately), so only the types block the build.

The log also warns, without failing:

- `eslint` in `next.config.mjs` is an unrecognized key (`next build` no longer lints).
- `images.domains` is deprecated in favour of `images.remotePatterns`.
- `middleware` is deprecated in favour of `proxy`.
- Turbopack inferred the repo root as the workspace root because there are two lockfiles; set `turbopack.root`.
- Next rewrote `tsconfig.json` (`jsx: react-jsx`, adds `.next/dev/types/**/*.ts` to `include`). Commit those edits in the bump PR.

## 2. What Next 16 changes for this codebase

Checked against `next@16.4.6` installed in a scratch directory, plus a scratch copy of `frontend/` with the codemods run and `next build`, Jest and ESLint executed.

| Change                                                                                                                                                                      | Effect here                                                                                                                                                                                                                                                                                                                        | Files                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `revalidateTag` needs a second argument; `updateTag` and `refresh` are new                                                                                                  | Breaks the build. Use `{ expire: 0 }` through one helper (step 1).                                                                                                                                                                                                                                                                 | 225 calls in 24 files; 181 tests in 38 suites assert the one-argument call    |
| `next lint` removed; `next build` no longer lints                                                                                                                           | `npm run lint` (CI job `lint`, `/ci`) breaks. Move to `eslint` CLI and `eslint.config.mjs`.                                                                                                                                                                                                                                        | `package.json`, `.eslintrc.json`, `next.config.mjs`, `.claude/commands/ci.md` |
| `eslint-config-next@16` requires ESLint 9 and ships react-hooks v7                                                                                                          | 104 new errors in 58 files (`set-state-in-effect` 46, `refs` 44, `use-memo` 6, others 8). Linting all of `frontend/` would add 182 `no-require-imports` errors in tests, so keep the old scope.                                                                                                                                    | 58 app files                                                                  |
| `middleware.ts` renamed to `proxy.ts` (Node runtime only)                                                                                                                   | Still works with a warning. `withAuth` from `next-auth/middleware` builds fine as proxy. The codemod did not rename it; do it by hand.                                                                                                                                                                                             | `middleware.ts`, docs                                                         |
| Sync `params`, `searchParams`, `cookies()`, `headers()` removed                                                                                                             | Already async everywhere (17 pages type `params: Promise`). The `next-async-request-api` codemod only rewrote 8 files that already await, so do not apply it.                                                                                                                                                                      | 0                                                                             |
| Caching: `cacheComponents` / `"use cache"` replace PPR and `dynamicIO`                                                                                                      | Opt-in. Without it, `fetch` caching is the same as 15: uncached by default, `next: { revalidate, tags }` opts in. `fetchAPI`, `CACHE_TAGS` and the `cache`/`next` exclusivity rule are unchanged. Do not enable `cacheComponents` in this migration; it conflicts with our 16 `export const dynamic`/`revalidate` segment configs. | 0                                                                             |
| `experimental.staleTimes`, `experimental.serverActions`                                                                                                                     | Still accepted (listed as experiments in the build). `bodySizeLimit: 30mb` and `allowedOrigins` keep working.                                                                                                                                                                                                                      | 0                                                                             |
| Turbopack is the default for `dev` and `build`                                                                                                                              | We have no custom `webpack` config, and the Turbopack build passed in scratch (33 static pages, the rest dynamic). Set `turbopack.root`.                                                                                                                                                                                           | `next.config.mjs`                                                             |
| `next/image`: `images.domains` deprecated; new defaults (`minimumCacheTTL` 4 h, `qualities: [75]`, local IPs blocked, local images with query strings need `localPatterns`) | Only 3 components use `next/image`, all with local static files. `remotePatterns` already allows `https://**`, so delete `domains`.                                                                                                                                                                                                | `next.config.mjs`, 3 components                                               |
| `AppRouterInstance.bfcacheId` required                                                                                                                                      | One router mock in tests.                                                                                                                                                                                                                                                                                                          | 1 test                                                                        |
| Node 20.9+ required                                                                                                                                                         | CI build uses 22 and 20.14; the `lint` and `prettier` jobs use Node 18; `kubernetes.Dockerfile` uses `node:18-alpine`.                                                                                                                                                                                                             | 2 files                                                                       |
| AMP, `next/legacy/image`, `serverRuntimeConfig`, `unstable_` prefixes, edge runtime                                                                                         | Not used (codemods found nothing).                                                                                                                                                                                                                                                                                                 | 0                                                                             |

**Packages.** `next-auth@4.24.15` (installed) lists `next: ^12.2.5 || ^13 || ^14 || ^15 || ^16` and React 19 as peers, so it works as is; no Auth.js v5 move is needed. `nuqs@2.4.1` needs `next >= 14.2`. `eslint-config-next` must move to `16.4.6` with `next`, which pulls ESLint 9 (today ESLint 8.57.1 comes in only as its transitive peer).

## 3. Size

| Change                                          | Files                    | Lines (approx.)     |
| ----------------------------------------------- | ------------------------ | ------------------- |
| `revalidateTag` → `expireTag` helper            | 24 source files + helper | 260                 |
| Test assertions gain `{ expire: 0 }`            | 38 test suites           | 360                 |
| ESLint flat config, scripts, deps               | 4                        | 80 (plus lockfile)  |
| `next.config.mjs`, `tsconfig.json`, router mock | 3                        | 30                  |
| `proxy.ts` rename                               | 1 + docs                 | 20                  |
| CI Node version                                 | 2                        | 4                   |
| React Compiler lint errors                      | 58                       | 300–500 (follow-up) |
| Docs, skills, agents                            | ~15                      | 150                 |

## 4. Migration path

Merge in this order. Steps 1 and 2 are safe on Next 15 and can land before anyone touches `next`.

**Step 1 — `expireTag` helper (Next 15, ~270 lines).**
Add `expireTag(tag: string)` next to `CACHE_TAGS` in `lib/cache-tags.ts`, calling `revalidateTag(tag)` for now. Replace the 225 `revalidateTag` calls in the 24 files with it (sed-able, plus imports). Add a guard test in the style of `strapi-response-format-guard.test.ts` that fails when anything outside `lib/cache-tags.ts` imports `revalidateTag`. Tests are unchanged because the helper still calls the mocked `next/cache`. Update `docs/agent/data-fetching.md` (the "every mutation must call `revalidateTag()`" rule and examples), `frontend-architecture.md` line 130, and `.claude/skills/data-fetching/SKILL.md`.
Verifies: Jest green, build green, no behaviour change.

**Step 2 — CI and config prep (Next 15, ~30 lines).**
Bump the `lint` and `prettier` jobs in `.github/workflows/prettier.yml` from Node 18 to 22. Remove `images.domains` (covered by `remotePatterns`). Add `turbopack.root` and try `next build --turbopack` locally on 15 to shake out Turbopack issues early. Ask whoever owns `kubernetes.Dockerfile` whether it is still used; if so it needs Node 20+.
Verifies: CI green; images on dev still load (logo, footer, streak icons, droplet covers).

**Step 3 — the bump (Next 16, ~550 lines plus lockfile).**
This replaces #1350.

- `next` and `eslint-config-next` to `16.4.6`, `eslint` to `^9`.
- `expireTag` body becomes `revalidateTag(tag, { expire: 0 })`.
- Update the 181 assertions in 38 suites from `toHaveBeenCalledWith(tag)` to `toHaveBeenCalledWith(tag, { expire: 0 })`.
- Add `bfcacheId` to the mock in `tests/components/draft/add-lesson.test.tsx`.
- Remove the `eslint` key from `next.config.mjs`. Commit Next's `tsconfig.json` edits.
- Replace `.eslintrc.json` with `eslint.config.mjs` (the `next-lint-to-eslint-cli` codemod produces a working one with our rules), set `"lint": "eslint app components lib hooks providers contexts stores"` to keep today's scope, and set the 8 new `react-hooks` compiler rules to `"warn"`. Deleting `.eslintrc.json` needs the developer's approval.
- Update CLAUDE.md's version line and constraint (see step 5) in the same PR so agents stop writing Next 15 advice.
  Verifies: build, Jest, lint and prettier green; the dev test plan below on `dev2`.

**Step 4 — `proxy.ts` (Next 16, ~40 lines).**
Rename `middleware.ts` to `proxy.ts`; keep the `withAuth` default export and `config.matcher`. Update `frontend-architecture.md` item 5 and any skill that says "middleware". Kept separate so an auth regression is easy to bisect and revert.
Verifies: the build output lists `Proxy`, no deprecation warning; the auth checks below.

**Step 5 — docs sweep and lint follow-up.**
Docs (~150 lines): CLAUDE.md lines 3, 8 and 26 (Next.js 16; keep the `cache`/`next` rule; add "invalidate with `expireTag()`, never `revalidateTag(tag, "max")`"); `docs/agent/frontend-architecture.md` lines 5 and 105; `docs/agent/data-fetching.md` line 39; `.claude/skills/react-patterns/SKILL.md` (title, "This Is Next.js 15" section, comments at 67 and 255); `data-fetching` and `strapi-v5-patterns` skills; the comment at `frontend/lib/utils.ts:90`; a learnings note on `{ expire: 0 }` vs `"max"` vs `updateTag`.
Lint: one or more tickets to fix the 104 compiler-rule errors, a few hundred lines each, then raise the rules back to `"error"`.

## 5. Risks and test plan

**Caching and invalidation (highest risk).** If anyone uses `"max"` instead of `{ expire: 0 }`, reads after writes go stale with no error. The guard test from step 1 and one helper make this a single line to review. `updateTag()` would also work in Server Actions but throws in Route Handlers (`app/api/dev/reminders` reaches `runReminderCheck`) and is risky in `after()` (`lib/ai-review/score-run.ts`), so we do not use it. `staleTimes.dynamic: 0` stays, so the client router cache still refetches dynamic pages.

**Auth.** next-auth v4 is supported. `getServerSession` (5 files) is unchanged. The risk is the proxy rename in step 4 and the Node-only proxy runtime.

**Server Actions.** 33 `"use server"` files. `bodySizeLimit` and `allowedOrigins` must still apply; check a large upload and an action from `dev2.khouryodyssey.org`.

**Lint.** Demoting the new hook rules to warnings hides real bugs (`set-state-in-effect`, `refs`) until the follow-up lands.

**Turbopack.** Dev and build bundling change. Watch for CSS order (Tailwind, Mantine, BlockNote, KaTeX), `pdfjs-dist` workers, Sandpack and CodeMirror.

**Dev test plan** (after steps 3 and 4, on dev2, as a student, a content creator and a SysAdmin):

1. Sign in with Azure AD and GitHub. Signed-out `/activity`, `/d/...`, `/g/...` and `/admin` redirect to `/auth/login?callbackUrl=...`, and after sign-in land on that page (ODY-628). Signed-in `/`, `/auth/login` and `/request-access` redirect to `/activity` or `/explore`.
2. Read your own writes, each without a manual reload: enroll in a droplet, playlist and voyage; complete a lesson (streak count in the header changes); favorite and archive (the `/activity` tabs update); send and accept a friend request; join a group and see due dates; add a note and a highlight.
3. Reminders: snooze, mute and undo on My Feed; the badge count updates.
4. Reviews: post a comment and a reply; start an AI scoring run and see the panel update when `after()` finishes.
5. Creation: edit a draft droplet, add lessons, upload a large image or dataset (30 MB limit), publish, and see it in `/explore`.
6. Admin pages (`/admin/*`, all `force-dynamic`) load and their mutations show up.
7. Images: header logo in light and dark mode, footer icons, streak icons, droplet covers from S3/CDN.
8. Run the Playwright suites (`npm run test:e2e-*`) against dev2.

## 6. Recommendation

**Migrate now, in five PRs, within P-ODY-137.** The required change is small and mostly mechanical, the build passed on 16.4.6 in scratch, next-auth already supports it, and Next 16 has been stable for over a year (16.0.0 shipped 2025-10-22). Next 15.5 only gets backports now (15.5.29 on 2026-11-03), and every month on 15 adds more `revalidateTag` calls to convert. The migration does not depend on ODY-603 (Strapi on `production`), but it is better to promote it to `production` in a separate release from ODY-603 so a regression can be traced to one change.

A reason to wait: if a large feature branch with many new `revalidateTag` calls is about to merge, land step 1 first so that branch adopts `expireTag` when it rebases.

**About #1350:** do not merge it as is. Keep it open as the reminder until step 3 is up, then close it with a link to that PR. In the same step 3 PR, add to the `/frontend` block of `.github/dependabot.yml`:

```yaml
ignore:
  - dependency-name: "next"
    update-types: ["version-update:semver-major"]
  - dependency-name: "eslint-config-next"
    update-types: ["version-update:semver-major"]
```

and a `next` group with patterns `next` and `eslint-config-next`. If the team decides to wait instead, add the ignore rule now and close #1350; Dependabot will then offer 15.5.29 patches, which it does not offer separately while the major PR is open.
