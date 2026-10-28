# Strapi Prod Migration Day Playbook

The plan for the Strapi v5 cutover, on dev and then on **production**: the roles, the timeline and gates up to migration day, and what to do after the window. Work through it top to bottom and tick each box as you go.

This playbook covers **ODY-633: turning off Draft & Publish** and the **Strapi v5 upgrade** (ODY-597, rehearsed in ODY-602). On 2026-10-05 the team decided that ODY-633 doesn't ship alone on v4. It ships with v5 in one combined v4→v5 cutover. The [timeline](#strapi-v5-timeline-to-migration-day) lists what has to happen before migration day. The window itself is in [strapi-v5-cutover-window.md](strapi-v5-cutover-window.md), and rollback is in [strapi-v5-rollback.md](strapi-v5-rollback.md). Background and reasoning live in the Linear tickets [ODY-633](https://linear.app/aiil/issue/ODY-633), [ODY-596](https://linear.app/aiil/issue/ODY-596) (backup and rollback) and [ODY-28](https://linear.app/aiil/issue/ODY-28) (the Strapi 5 parent ticket). This page is only the steps.

> **Why this needs a window.** On its first boot with Draft & Publish (D&P) off, Strapi v5 permanently **deletes every row where `published_at IS NULL`**, then runs a one-way migration. Every such row has to be handled by hand in SQL _before_ the new backend boots, and the only way back afterwards is a pre-migration copy of the database.

## Roles

| Role              | Who   | Does                                                                                                   |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Driver            | _TBD_ | Runs the SQL and AWS steps, and makes the go/no-go calls                                               |
| Reviewer          | _TBD_ | Reviews the per-row decisions and the prod handling SQL before the window                              |
| Comms             | _TBD_ | Announces the window and the admin edit freeze, and confirms when both end                             |
| Rollback approver | _TBD_ | Signs off on any rollback after the site has reopened ([strapi-v5-rollback.md](strapi-v5-rollback.md)) |

## Strapi v5: timeline to migration day

Status as of 2026-10-06. Migration day (**M**) isn't set yet. Set it at gate C, once ODY-602 has timed the migration. Every phase ends at a gate. Don't start the next phase until that gate passes. Phases 1 and 2 can run at the same time. Strapi 4 is end of life (ODY-639), so keep the gaps between phases short.

**Order change (2026-10-22): dev goes first.** Dev has no real user data, so the dev cutover (phase 4) is the first rehearsal. It starts after gate B. The prod-copy rehearsal (phase 3, ODY-602) runs after gate D, alongside the dev soak. Gate C gates the prod window (M), not the dev cutover. The phase numbers are unchanged; the table below is in the new order.

| Phase                       | What                                                                      | Gate                                                |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| 1. Code blockers            | Close the open audit findings and the hard-gate tickets on the branch     | **A:** a re-run `/audit` has only Critical 3 open   |
| 2. Scripts and runbook      | v5 `03`, the ODY-596 restore runbook, the combined window steps           | **B:** the dev cutover can start                    |
| 4. Dev cutover              | Merge `feature/strapi-v5` → `develop` with the window steps (rehearsal 1) | **D:** dev runs v5 and its smoke check passes       |
| 3. Rehearsal (ODY-602)      | The full combined v4→v5 run on a PG 18 copy of prod, during the dev soak  | **C:** every ODY-602 criterion passes, and M is set |
| 5. Dev soak and window prep | Soak on dev, then announce the window                                     | **E:** go/no-go at M−1 (needs gate C)               |
| M                           | Run the window                                                            |                                                     |

**Already done:** ODY-597, 598, 599, 600, 601, 606, 607, 633 (code), 634, 635, 700 and 701, plus the 204 DELETE fix (audit Critical 1 and 2).

### Phase 1: Code blockers (starts now)

- [x] **1.1 ODY-699 (hard gate for any v5 deploy):** the v5 admin hides `status` on droplets and voyages, so editors can't change it. Fixed by the content-manager extension in `backend/src/extensions/content-manager/` (ticket: [ODY-699](https://linear.app/aiil/issue/ODY-699)); verified on the `ody597` scratch DB.
- [x] **1.2 Audit Warning 4 (a person must do this, because agents can't edit `docker-compose.yml`):** remove the `developTesting` infra changes from the branch (the Infisical `--env=prod` `entrypoint.sh` files and the `docker-compose.yml` changes), or get the owner's sign-off.
- [x] **1.3 Audit Warning 5:** add a backend Jest step to `build.yml` that runs on the deploy Node version.
- [x] **1.4 Audit Warning 6:** make the default `strapi-document-id` Jest mock non-identity (for example `"doc" + id`) and fix whatever breaks.
- [x] **1.5 Audit Minor 7 and 8:** add the v4 header to `frontend/scripts/migrate-*.ts`, or mark those scripts v4-only. Warn or fail when `AWS_S3_BUCKET` is unset in production.
- [x] **1.6 ODY-636:** check v5's users-permissions `allowedFields` and log-level defaults.
- [x] **1.7 ODY-724:** smoke-test the email provider on v5.
- [x] **1.8 Node version (ODY-604):** choose 20.14.0 (today's images) or Node 22. The rehearsal must use the same image the cutover deploys. Choosing 20.14.0 (today's images)
- [x] **1.9 Prod token type:** find out whether prod's `STRAPI_ACCESS_TOKEN` is full-access or custom. Every ODY-635 finding assumes full-access. It is full-access
- [x] **1.10** Create a Linear ticket for the 204 fix, then rename `scripts/strapi-v5-delete-204/` to match it.

**Gate A:** a re-run `/audit` on `feature/strapi-v5` has only Critical 3 open. The rehearsal closes Critical 3. **Passed:** the re-run found only the expected blocker (the D&P cutover isn't rehearsed yet).

### Phase 2: Scripts and runbook (runs alongside phase 1)

- [ ] **2.1 ODY-596 backup and rollback:** the rollback runbook is [strapi-v5-rollback.md](strapi-v5-rollback.md), and its scripts are in `scripts/strapi-v5-cutover/rollback/` (written 2026-10-15 and tested on throwaway PG 18 and PG 12 databases). Rehearsed on dev data: Path B on 2026-10-22 and Path C on 2026-10-23 (locally, about 3 min), and an RDS drill on 2026-10-23 on a restored dev snapshot. The drill proved that RDS lets `postgres` copy and rename a database named `postgres` from `template1`, and Path D's restore took about 10 min. Still to do: store a prod `pg_dump` somewhere durable, test the restore on a scratch DB and record how long it takes (3.6), and decide whether S3 media needs a snapshot too: the files don't change, but the upload rows do.
- [x] **2.2 Rewrite `03-post-switch-verify.sql` for v5:** v5 keeps `published_at` and renames the join tables (`*_lnk`, `*_cmps`, `files_related_mph`). Leave `01` and `02` on the v4 names, because they run on v4 data before the first v5 boot. Done 2026-10-07 and run clean on the `ody597` scratch DB. v5 gives Super Admin publish permissions again on boot, so `03` now checks only the other roles.
- [x] **2.3 Write the combined v4→v5 window steps** for dev and prod. Written 2026-10-07 in [strapi-v5-cutover-window.md](strapi-v5-cutover-window.md); the Reviewer's review is part of gate B.
  - The order: freeze → snapshot → backend to 0 → T0 fingerprint, dump and media listing → `01` → `02` → gate → frozen copy and copy check → merge → wait for `PRIMARY` → scale to 1 → wait for the migration to finish → `03` (v5) and fingerprint → the API smoke script → manual smoke check. The ODY-700 script renames real entries, so it runs only in the rehearsal.
  - Rollback means putting back a pre-migration copy of the database (the frozen copy, the dump or the snapshot), then reverting the merge. A `git revert` by itself doesn't undo the migration.
  - Write down the decision point: "roll back if X is still broken at time Y."
- [x] **2.4 Assign the roles** (Driver, Reviewer and Comms) in the table above.
- [x] **2.5 ODY-605:** update the agent docs and skills for v5 on `feature/strapi-v5`, so the develop merge carries them (audit-2 Minor 2). Blocks ODY-603.

**Gate B:** the ODY-596 restore has been tested, the v5 version of `03` exists, the Reviewer has reviewed the window steps, and ODY-605 has landed.

### Phase 3: Rehearsal, ODY-602 (Awad)

Runs after gate D, alongside the dev soak (phase 5). Gate E needs gate C.

- [ ] **3.1** Take a fresh prod backup and restore it to a scratch PG 18 database.
- [ ] **3.2** Run `01` on the copy and make the per-row decisions. Write `~/ody-633/02-handle-unpublished.prod.sql` outside the repo and get the Reviewer's sign-off. Apply it, then run `01` again and confirm 0 unpublished rows. Then make the frozen copy and check it, as in cutover window steps 7a–7b.
- [ ] **3.3** Build `ecs.prod.Dockerfile` on the chosen Node version and boot it against the copy, using prod's `API_TOKEN_SALT`. Time the migration.
- [ ] **3.4** Run `03` (v5), `scripts/strapi-v5-cutover/api-smoke/smoke-queries.sh` (expect all 218 checks to pass), `scripts/ody-700/smoke-regenerate-slug.sh`, and the e2e suite. Compare the e2e results with the ODY-584 baseline.
- [ ] **3.5** Check record counts per content type, relations, CKEditor content, S3/CDN media URLs, roles, token permissions and compression. The migration should drop 16 orphan `files_related_morphs` rows.
- [ ] **3.6** Run the rollback once on the copy ([Path B](strapi-v5-rollback.md#path-b-swap-back-to-the-frozen-copy): `writes-since.sql`, `swap-back.sql`, `fingerprint.sql`, then boot the v4 image) and time it from the decision to a passing v4 smoke check. This is `T_rb` in the cutover window.
- [ ] **3.7** File each issue you find and link it to ODY-602. If a fix changes the migration or the schema, run the rehearsal again.

**Gate C:** every ODY-602 acceptance criterion passes, which closes audit Critical 3. Set **M**, and size the window as migration time + rollback time + a buffer. The dev numbers in 4.0 are for scale only; prod is PG 18 with more data, so size the prod window from 3.3 and 3.6.

### Phase 4: Dev cutover

Merging `feature/strapi-v5` into `develop` runs the one-way migration on the dev RDS (PG 16.13), so treat it as a cutover. It starts after gate B, before phase 3.

- [x] **4.0 Local rehearsal on a copy of live dev (2026-10-22): passed.** Dev has no real user data, so it is the first rehearsal; ODY-602 still runs on prod data before M. The copy was a `pg_dump` of `odyssey-dev2` (27 MB) restored into a local `postgres:16`, booted with `ecs.dev.Dockerfile` (Node 20.14). It ran under amd64 emulation on Apple Silicon, so the times are upper bounds.

  - `02`: committed (7 droplets back-filled, lesson 278 deleted). `01` afterwards showed 0 unpublished rows.
  - **`T_mig` ≈ 15 s.** The internal migrations took 3.2 s (longest `5.0.0-02-created-document-id`, 1.4 s; `discard-drafts` 0.14 s), and container start to `Strapi started successfully` took 14 s. `03` matched the gate in every section, and the fingerprint showed `v5`.
  - **`T_rb`, database part ≈ 77 s** (Path B, decision to a restored `v4` fingerprint). The swap itself took 2 ms. This doesn't include ECS deploying the v4 rollback task definitions, which can't be rehearsed locally.
  - On dev, the pipeline build and ECS task start take far longer than the migration. Size the dev window around those.

- [ ] **4.1 Last v4 release:** release the current `develop` to `production` first, so the prod cutover merge contains only v5 work.
- [ ] **4.2 Release freeze starts:** from now on, any `develop` → `production` merge _is_ the prod cutover. Branch prod hotfixes off `production`. Comms announces the freeze.
- [ ] **4.3** Run the [combined window steps](strapi-v5-cutover-window.md) on dev. `dev2-image-push.yml` sets no desired count, so scale the backend back up by hand.
- [ ] **4.4** Smoke-check dev as staff and as a normal user.

**Gate D:** dev runs v5, `03` and the smoke scripts pass, and the soak period starts.

### Phase 5: Dev soak and window prep (up to M)

Phase 3 runs during this phase. Don't set M or hold the go/no-go until gate C has passed.

- [ ] **5.1** Soak dev for an agreed period. ODY-603 asks for "a set period" but doesn't give a length yet. Watch the ECS logs and error rates.
- [ ] **5.2** Schedule the window. Comms announces the window and the Strapi admin edit freeze.
- [ ] **5.3 M−1 go/no-go:**
  - The Driver checks access: `psql` to prod RDS (including permission to copy and rename databases), RDS snapshots, ECS service updates, ECR and the media bucket.
  - Record the exact merge SHA, tag the v4 images `v4-pre-v5-<date>`, and register the rollback task definitions (see the window doc's "Before the window").

## Migration day

Run the window from [strapi-v5-cutover-window.md](strapi-v5-cutover-window.md), on dev in phase 4 and on prod at M. If anything goes wrong, follow [strapi-v5-rollback.md](strapi-v5-rollback.md). Both use the scripts in `scripts/strapi-v5-cutover/`:

| Folder              | What it's for                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `unpublished-rows/` | `01` audit, `02` handle (dev decisions; prod's copy is outside the repo), `03` verify after v5 |
| `rollback/`         | Fingerprint, frozen copy, swap back, and the writes-since report                               |
| `api-smoke/`        | Replays every frontend request against the running backend (read-only)                         |

The v4-only ODY-633 window and rollback steps that used to be here are gone. Their prep items now live in phases 3–5, and reverting the merge alone can't undo a v5 migration. `unpublished-rows/04-reenable-check.sql` belonged to that old rollback and isn't used.

## After the window

- [ ] Record in ODY-603 (and the audit counts in ODY-633): audit counts before and after, deletes, timings, and anything unexpected. Include **no real user data**.
- [ ] Keep the frozen copy, the dump and the snapshot until 24 hours after `T_open`, when the rollback horizon closes. Dropping or deleting any of them needs explicit approval.
- [ ] Delete saved output that holds prod data (audits, fingerprints, the dump) once it's no longer needed for rollback.
- [ ] Tell the team how to take content down now that Strapi's Publish/Unpublish is gone:
  - **Emergency:** delete the entry in the Strapi admin. This is permanent; ODY-659 keeps pages from crashing on the broken links.
  - **Routine:** set `isHidden` (droplets), `isPublic=false` (playlists) or `status=draft` (voyages). Hidden droplets are removed from listings but stay reachable by URL until [ODY-660](https://linear.app/aiil/issue/ODY-660) ships, while private playlists (`isPublic=false`) are reachable only by enrolled users.
