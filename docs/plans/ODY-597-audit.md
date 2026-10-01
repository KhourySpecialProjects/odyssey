# Audit: ODY-597, Strapi v4.26.2 → v5.56.0 upgrade (build + boot only)

Date: 2026-10-01
Branch: `feature/ody-597-run-strapi-v4-v5-upgrade-tool` → PR target `feature/strapi-v5`
Scope: `git diff feature/strapi-v5...HEAD` (13 commits, 23 files). ODY-633 and earlier changes are not audited here.
Files changed: 23. That is 7 agent/rules docs, 1 plan, `backend/package.json`, `backend/package-lock.json`, `backend/.prettierrc.json`, `backend/config/server.ts`, 5 schema JSONs (CKEditor stand-in), 3 lifecycles plus 1 controller (cast and type-import fixes), and 2 generated type files.
Investigations: (1) deploy/CI and runtime compatibility, (2) lockfile integrity and supply chain, (3) security (overrides, `npm audit`, webhooks, API tokens), (4) agent-doc consistency plus CKEditor revertability. Then one validation pass.

> **Process note:** this session had no subagent-spawning tool. The auditor ran the four investigations and the validation pass directly, one after another. So the validation pass was **not** fresh-context. To make up for that, each finding below was re-checked against the code or a command output before it was kept.

## Confirmed Issues

### Critical (must fix before merge)

None.

### Warnings (should fix)

1. **v5 has never been built or booted on the Node version prod and CI actually use (20.14.0), or from the real Docker image layout.** Evidence:

   - `docs/plans/ODY-597.md:442`: boot was on Node 24.12.0. Build was local, on the same Node.
   - `.github/workflows/build.yml:57`: CI uses `20.14.0`. `backend/ecs.prod.Dockerfile:1` and `backend/ecs.dev.Dockerfile:1` use `node:20.14.0-alpine`.

   What this audit checked:

   - The new lockfile contains 4 packages whose `engines` exclude 20.14.0:

     - `cheerio@1.2.0` and `undici@7.30.0` need `>=20.18.1`;
     - `preferred-pm@5.0.0` and `which-pm@4.0.0` need `>=22.13`.

     They come in through `@strapi/plugin-documentation` and `@strapi/utils`.

   - Their runtime risk looks low:
     - `preferred-pm` is loaded with a dynamic `import()` and uses no Node 22 APIs (`@strapi/utils/dist/get-preferred-pm.js:5`).
     - `cheerio` is only `require`d lazily, in the documentation `loginView` (`@strapi/plugin-documentation/dist/server/controllers/documentation.js:90`).
     - Every Strapi server entry point loads on Node 20 with `--no-experimental-require-module` (this emulates the missing `require(esm)` support before 20.19).
     - `npm ci --dry-run` with npm 10.8.2 exits 0, with `EBADENGINE` warnings only.

   What is still unverified:

   - CI's `backend-build` will be the first v5 build on 20.14.0 **and** the first one without a `.env`. v5 `strapi build` now calls `createStrapi()` and loads `config/*` (`@strapi/strapi/dist/src/node/create-build-context.js:50-60`).
   - No v5 boot has run on 20.14.0.
   - No v5 build has run in the Dockerfile layout (`/opt/node_modules` with the app in `/opt/app`). v5 resolves the admin peer deps from `cwd` (`core/dependencies.js:206-213`). That should work, but it is untested.

   Also, Node 20 reached end-of-life in April 2026.

   **Fix:** treat a green `backend-build` on this PR as a merge gate. Add "build and boot the `ecs.prod.Dockerfile` image against the rehearsal DB" to ODY-602 (or ODY-604), and consider moving the images to Node 22/24 LTS in ODY-604.

2. **`docs/agent/backend-architecture.md` contradicts the new branch note and has no branch note of its own.** File: `docs/agent/backend-architecture.md:1-12`.

   - It says "This is **Strapi v4.22**, not v5 … Never use Strapi v5 patterns. If you find v5 docs online, they will not work."
   - `CLAUDE.md:19` now says "For backend config and APIs, use the Context7 v5 docs."
   - Agents are sent to this file by `CLAUDE.md:67` (content types, Strapi API) and by `.claude/rules/strapi-backend.md:18`.
   - D11/D18 added the one-line note to 7 files, but not this one.
   - The full rewrite is rightly deferred, but the one-line note costs nothing.

   **Fix:** add the same one-liner under its heading, in this PR, or record the gap on purpose in the follow-ups.

## Disputed (validator thinks these are false positives)

1. **"The CLAUDE.md note says frontend compatibility only needs ODY-607, but ODY-601 is also needed."**
   - Validator notes: `CLAUDE.md:19` says "The frontend still expects v4 nested responses until ODY-607". That is a correct statement about response _shape_, not a claim of full compatibility. The PR draft covers ODY-601 and ODY-700 explicitly.
   - Optional: add "(and numeric-id URLs until ODY-601)".
2. **"The agent, rules and skill notes say 'On `feature/strapi-v5` branches', which child branches such as `feature/ody-598-…` don't literally match."**
   - Validator notes: every note points to `CLAUDE.md`. On any child branch, `CLAUDE.md` itself carries the replaced bullet "This branch line (`feature/strapi-v5` and its children)…", so an agent reading it gets the right answer.
   - Low risk. Optional hardening: "(check: `@strapi/strapi` in `backend/package.json` is 5.x)".
3. **"Removing `webhooks.populateRelations` changes webhook payloads."**
   - Validator notes: there is no reference to `WEBHOOKS_POPULATE_RELATIONS` anywhere in the repo, and no webhook consumer in `frontend/app/api/` (only `auth`, `run-code`, `user-activity`).
   - The v4 default was `false`, so v5's behaviour (never populate) is the same as what runs today. Not a regression.
4. **"Exact `5.56.0` pins vs AC1 `^5.x`."**
   - Validator notes: this is documented and on purpose (Codemod log, "Exact pins vs AC1"). All 31 `@strapi/*` lock entries resolve to `5.56.0` consistently. Not a defect.

## Observations (no issues, but noted)

1. **Lockfile integrity is clean** (`backend/package-lock.json`).
   - Manifest and source:
     - lockfileVersion 3, 1,555 entries;
     - every `resolved` URL is on `https://registry.npmjs.org`;
     - every entry has a sha512 `integrity` (no sha1, no git/file/link/tarball sources);
     - the root `packages[""]` matches `package.json` exactly (deps, engines, no devDeps).
   - Install scripts:
     - 5 packages have install scripts, all well-known: `@swc/core`, `core-js-pure`, `esbuild` ×2, `fsevents`.
     - v4 had 8, including `sharp@0.32.6` and an `@strapi/strapi` postinstall. `sharp@0.35.4` now uses prebuilt `@img/*` binaries.
   - Platforms: the native optional packages for linux-x64 gnu **and** musl are present (rollup, esbuild, swc, sharp/libvips, lightningcss, tailwind oxide), so the macOS-generated lock won't hit the npm "missing platform optional dep" bug on Ubuntu CI or Alpine ECS.
   - Leftovers: none from ckeditor, plugin-cloud, plugin-i18n or pack-up. `npm ls --all` exits 0.
2. **Overrides were verified, not just kept.**
   - Resolved: `@aws-sdk/client-s3`, `lib-storage` and `s3-request-presigner` are a single 3.1144.0 (the ODY-620 dedupe holds).
   - Also resolved: `axios` 1.20.0, `qs` 6.16.0, `@casl/ability` 6.8.1, `lodash-es` 4.18.1, `rollup` 4.62.3, `tar` 7.5.22, `ws` 8.22.0, `minimatch@3` 3.1.5, `yaml@1` 1.10.3.
   - `sanitize-html` and `ws@7` are absent from the tree, so their overrides are inert.
   - Dropping the `@strapi/pack-up` → `vite 5.4.21` override is safe: v5 resolves `vite@5.4.21` anyway.
   - Small PR-draft wording fix: "All overrides kept" sits next to "Removed: the `@strapi/pack-up` override". Say "all remaining overrides kept".
3. **The diff greatly improves `npm audit`.**
   - Base branch (v4 lock): 111 findings (1 critical, 9 high).
   - This branch: 23 findings (0 critical, 4 high). That matches the plan's record.
   - Of the 4 highs:
     - `vite` and `webpack-dev-middleware` are dev-server only (`strapi develop`). ECS runs `strapi start`.
     - `@strapi/strapi` is an aggregate entry.
     - `nodemailer@9.0.1` (through `@strapi/provider-email-sendmail`) is the only server-side runtime one. It is only reached when Strapi sends mail (admin or users-permissions password reset).
   - Moderates that touch the server: `stream-json` (admin data-transfer only). The rest are admin-browser-side (react-router, dompurify, markdown-it).
   - No ticket exists yet; see the proposed tickets.
   - Dependabot (`.github/dependabot.yml`) targets only `develop`, so `feature/strapi-v5` gets no automatic security PRs while the migration runs.
4. **API tokens.**
   - `config/admin.ts` is unchanged (`apiToken.salt`), and Task 10 showed that a v4-era token works on v5.
   - Hygiene: the scratch tokens `ody597-smoke` (no expiry, full access) and `ody597-smoke-a` live only in the local `ody597` DB. Delete them, or drop `ody597`, once it's no longer needed.
5. **Strapi AI.** v5.56's CTB brings in `@ai-sdk/*` and creates the `strapi_ai_*` tables. AI stays inactive without an EE license (`@strapi/admin/dist/server/server/src/ai/services/ai.js:21-23`), so no action is needed. ODY-636 could set `admin.ai.enabled: false` explicitly.
6. **The CKEditor stand-in is revertable.**
   - The 5 original attribute JSONs on `feature/strapi-v5` match the plan's "CKEditor stand-in design" byte-for-byte (checked with `git show`).
   - Two notes for ODY-598:
     - (a) A plain `git revert f0e3aaf3` will conflict, because that commit also touched `package.json` and the v4-style generated types. Re-apply the 5 JSON snippets instead.
     - (b) Revert note (b), hand-editing `types/generated/*`, isn't needed. v5 typegen rewrites those files on every `develop`.
7. **Cutover mechanics (input for ODY-602, not caused by this PR).**
   - Dev: once `feature/strapi-v5` merges to `develop`, `dev2-image-push.yml` auto-deploys the backend. That deploy **is** the one-way v5 migration on the dev RDS.
   - Prod: `prod-image-push.yml` does a rolling update, so v4 and v5 tasks can overlap on a migrating DB.
   - The scale-to-0 / backup / `PRIMARY`-check pattern in `docs/playbooks/strapi-prod-migration-day.md` (ODY-633) should be reused for both.
   - The 5 stand-in fields and ODY-699/700 make ODY-598 and ODY-700 hard gates before any deploy.
8. **Integration-branch hygiene.** Dependabot keeps changing `backend/package-lock.json` on `develop`. When merging `develop` into `feature/strapi-v5` (D8), keep the v5 `package.json` and regenerate the lock; don't hand-merge it. Task 7 showed that npm can't move a v4 lock forward in place.
9. **Type-only fixes are confirmed type-only.** The 4 `as unknown as` casts and the `import type { Core }` change emit no runtime difference. They are correctly scheduled for removal in ODY-606.
10. **`backend/.prettierrc.json`** only affects typegen and tools started inside `backend/`. The root `.prettierignore` excludes `/backend`, so CI Prettier and the frontend are unaffected.

## Regression Risk

The frontend is unchanged, and the PR targets an integration branch that no workflow deploys from (`dev2`/`prod` image pushes only fire on `develop`/`production`). So nothing that exists today can break from merging this. The real regression surface is the future cutover:

- Node 20.14 and the Docker image layout (Warning 1);
- the rolling-deploy and auto-deploy mechanics (Observation 7);
- the already-ticketed ODY-599/606/699/700 write paths.

## Test Coverage

The backend has no automated tests (ODY-599 owns the lifecycle tests). The v5 lock routes' writes, the droplet `edit` Slack alert, the lesson empty-content guard, the creation-request alert and slug regeneration are all unexercised on v5. They are recorded in the plan and PR draft. Frontend Jest passed (335 suites) but doesn't touch this change.

## Verdict: APPROVE WITH CONDITIONS

There are no Critical issues. The upgrade is clean, well documented, supply-chain-sane and a large net security gain. Conditions:

1. This PR's `backend-build` CI job (Node 20.14.0, `npm ci`, no `.env`) must pass. It is the first v5 build in that environment.
2. Add the one-line v5 branch note to `docs/agent/backend-architecture.md`, or record the gap on purpose.

Docker-image and Node 20.14 boot verification goes into ODY-602/604 (proposed below).

## Linear Tickets Created

None. As instructed, no Linear issues were created. Proposed tickets, for the user to approve (D16):

1. **[AUDIT] Build and boot the v5 backend from the real ECS image (Node 20.14.0) before cutover.** Suggested as a comment or AC on ODY-602 or ODY-604, not a new ticket.
   - Priority: High. Parent: ODY-28.
   - What's broken: v5 was only built and booted on Node 24.12 with local `node_modules`.
   - What should happen: `ecs.prod.Dockerfile` builds, and `strapi start` boots against the rehearsal DB on Node 20.14.0 (or on the Node LTS that ODY-604 picks).
   - Evidence: `backend/ecs.prod.Dockerfile:1`, `.github/workflows/build.yml:57`, `docs/plans/ODY-597.md:442`, and the lock `engines` for cheerio, undici, preferred-pm and which-pm.
2. **[AUDIT] Triage the v5 backend `npm audit` (23 findings, 4 high) and cover `feature/strapi-v5` with dependency alerts.**
   - Priority: Medium. Parent: ODY-28.
   - What's broken: no ticket tracks the 4 highs. `nodemailer` (through `provider-email-sendmail`) is server-side, and Dependabot only watches `develop`.
   - What should happen: decide upgrade or accept for each finding after the migration, and either add a temporary Dependabot entry for `feature/strapi-v5` or run a manual audit at each `develop` merge.
   - Evidence: `npm audit` on `backend/package-lock.json`, and `.github/dependabot.yml:13-21`.
