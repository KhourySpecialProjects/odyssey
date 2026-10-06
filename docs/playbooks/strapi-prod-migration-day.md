# Strapi Prod Migration Day Playbook

A checklist for the engineers running a Strapi migration against **production**: what to prepare, what to run during the maintenance window, and how to roll back. Work through it top to bottom and tick each box as you go.

This playbook covers **ODY-633: turning off Draft & Publish** and the **Strapi v5 upgrade** (ODY-597, rehearsed in ODY-602). On 2026-10-05 the team decided that ODY-633 doesn't ship alone on v4. It ships with v5 in one combined v4→v5 cutover. The [timeline](#strapi-v5-timeline-to-migration-day) lists what has to happen before migration day. The v4-only window steps below are the starting point for the combined steps (task 2.3). Background and reasoning live in [docs/plans/ODY-633.md](../plans/ODY-633.md) and [docs/plans/strapi-v5-branch-audit.md](../plans/strapi-v5-branch-audit.md). This page is only the steps.

> **Why this needs a window.** On the first boot with Draft & Publish (D&P) off, Strapi v4 permanently **deletes every row where `published_at IS NULL`**, then drops the `published_at` column. This happens before any migration runs, so it can't be fixed in code. Every such row has to be handled by hand in SQL _before_ the new backend boots.

## Roles

| Role     | Who   | Does                                                                       |
| -------- | ----- | -------------------------------------------------------------------------- |
| Driver   | _TBD_ | Runs the SQL and AWS steps, and makes the go/no-go calls                   |
| Reviewer | _TBD_ | Reviews the per-row decisions and the prod handling SQL before the window  |
| Comms    | _TBD_ | Announces the window and the admin edit freeze, and confirms when both end |

## Strapi v5: timeline to migration day

Status as of 2026-10-06. Migration day (**M**) isn't set yet. Set it at gate C, once ODY-602 has timed the migration. Every phase ends at a gate. Don't start the next phase until that gate passes. Phases 1 and 2 can run at the same time. Strapi 4 is end of life (ODY-639), so keep the gaps between phases short.

| Phase                       | What                                                                  | Gate                                                |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| 1. Code blockers            | Close the open audit findings and the hard-gate tickets on the branch | **A:** a re-run `/audit` has only Critical 3 open   |
| 2. Scripts and runbook      | v5 `03`, the ODY-596 restore runbook, the combined window steps       | **B:** the rehearsal can start                      |
| 3. Rehearsal (ODY-602)      | The full combined v4→v5 run on a PG 18 copy of prod                   | **C:** every ODY-602 criterion passes, and M is set |
| 4. Dev cutover              | Merge `feature/strapi-v5` → `develop` with the window steps           | **D:** dev runs v5 and its smoke check passes       |
| 5. Dev soak and window prep | Soak on dev, then announce the window                                 | **E:** go/no-go at M−1                              |
| M                           | Run the window                                                        |                                                     |

**Already done:** ODY-597, 598, 599, 600, 601, 606, 607, 633 (code), 634, 635, 700 and 701, plus the 204 DELETE fix (audit Critical 1 and 2).

### Phase 1: Code blockers (starts now)

- [ ] **1.1 ODY-699 (hard gate for any v5 deploy):** the v5 admin hides `status` on droplets and voyages, so editors can't change it. Fixed by the content-manager extension in `backend/src/extensions/content-manager/` (plan: `docs/plans/ODY-699.md`); tick after the manual check on the `ody597` scratch DB (plan Task 5).
- [ ] **1.2 Audit Warning 4 (a person must do this, because agents can't edit `docker-compose.yml`):** remove the `developTesting` infra changes from the branch (the Infisical `--env=prod` `entrypoint.sh` files and the `docker-compose.yml` changes), or get the owner's sign-off.
- [ ] **1.3 Audit Warning 5:** add a backend Jest step to `build.yml` that runs on the deploy Node version.
- [ ] **1.4 Audit Warning 6:** make the default `strapi-document-id` Jest mock non-identity (for example `"doc" + id`) and fix whatever breaks.
- [ ] **1.5 Audit Minor 7 and 8:** add the v4 header to `frontend/scripts/migrate-*.ts`, or mark those scripts v4-only. Warn or fail when `AWS_S3_BUCKET` is unset in production.
- [ ] **1.6 ODY-636:** check v5's users-permissions `allowedFields` and log-level defaults.
- [ ] **1.7 ODY-724:** smoke-test the email provider on v5.
- [ ] **1.8 Node version (ODY-604):** choose 20.14.0 (today's images) or Node 22. The rehearsal must use the same image the cutover deploys.
- [ ] **1.9 Prod token type:** find out whether prod's `STRAPI_ACCESS_TOKEN` is full-access or custom. Every ODY-635 finding assumes full-access.
- [ ] **1.10** Create a Linear ticket for the 204 fix, then rename `docs/plans/strapi-v5-delete-204.md` to match it.

**Gate A:** a re-run `/audit` on `feature/strapi-v5` has only Critical 3 open. The rehearsal closes Critical 3.

### Phase 2: Scripts and runbook (runs alongside phase 1)

- [ ] **2.1 ODY-596 backup and rollback:** store a prod `pg_dump` somewhere durable. Write the rollback runbook: v5 tasks to 0 → restore → redeploy the last v4 image tag → check the frontend. Test the restore on a scratch DB and record how long it takes. Decide whether S3 media needs a snapshot too: the files don't change, but the upload rows do.
- [ ] **2.2 Rewrite `03-post-switch-verify.sql` for v5:** v5 keeps `published_at` and renames the join tables (`*_lnk`, `*_cmps`, `files_related_mph`). Leave `01` and `02` on the v4 names, because they run on v4 data before the first v5 boot.
- [ ] **2.3 Write the combined v4→v5 window steps** in this playbook, for dev and prod:
  - The order: freeze → snapshot → backend to 0 → `01` → `02` → gate → merge → wait for `PRIMARY` → scale to 1 → wait for the migration to finish → `03` (v5) → the ODY-635 and ODY-700 smoke scripts → manual smoke check.
  - Rollback means restoring the snapshot, not running `git revert`.
  - Write down the decision point: "roll back if X is still broken at time Y."
- [ ] **2.4 Assign the roles** (Driver, Reviewer and Comms) in the table above.

**Gate B:** the ODY-596 restore has been tested, the v5 version of `03` exists, and the Reviewer has reviewed the window steps.

### Phase 3: Rehearsal, ODY-602 (Awad)

- [ ] **3.1** Take a fresh prod backup and restore it to a scratch PG 18 database.
- [ ] **3.2** Run `01` on the copy and make the per-row decisions. Write `~/ody-633/02-handle-unpublished.prod.sql` outside the repo and get the Reviewer's sign-off. Apply it, then run `01` again and confirm 0 unpublished rows.
- [ ] **3.3** Build `ecs.prod.Dockerfile` on the chosen Node version and boot it against the copy, using prod's `API_TOKEN_SALT`. Time the migration.
- [ ] **3.4** Run `03` (v5), `scripts/ody-635/smoke-queries.sh` (expect all 218 checks to pass), `scripts/ody-700/smoke-regenerate-slug.sh`, and the e2e suite. Compare the e2e results with the ODY-584 baseline.
- [ ] **3.5** Check record counts per content type, relations, CKEditor content, S3/CDN media URLs, roles, token permissions and compression. The migration should drop 16 orphan `files_related_morphs` rows.
- [ ] **3.6** Run the ODY-596 rollback once on the copy and time it.
- [ ] **3.7** File each issue you find and link it to ODY-602. If a fix changes the migration or the schema, run the rehearsal again.

**Gate C:** every ODY-602 acceptance criterion passes, which closes audit Critical 3. Set **M**, and size the window as migration time + rollback time + a buffer.

### Phase 4: Dev cutover

Merging `feature/strapi-v5` into `develop` runs the one-way migration on the dev RDS (PG 16.13), so treat it as a cutover.

- [ ] **4.1 Last v4 release:** release the current `develop` to `production` first, so the prod cutover merge contains only v5 work.
- [ ] **4.2 Release freeze starts:** from now on, any `develop` → `production` merge _is_ the prod cutover. Branch prod hotfixes off `production`. Comms announces the freeze.
- [ ] **4.3** Run the combined window steps on dev. `dev2-image-push.yml` sets no desired count, so scale the backend back up by hand.
- [ ] **4.4** Smoke-check dev as staff and as a normal user.

**Gate D:** dev runs v5, `03` and the smoke scripts pass, and the soak period starts.

### Phase 5: Dev soak and window prep (up to M)

- [ ] **5.1** Soak dev for an agreed period. ODY-603 asks for "a set period" but doesn't give a length yet. Watch the ECS logs and error rates.
- [ ] **5.2 ODY-605:** update the agent docs and skills for v5. This blocks ODY-603.
- [ ] **5.3** Schedule the window. Comms announces the window and the Strapi admin edit freeze.
- [ ] **5.4 M−1 go/no-go:**
  - The Driver checks access: `psql` to prod RDS, RDS snapshots, and ECS service updates.
  - Record the last v4 task definition ARN and image tag (for rollback) and the exact merge SHA.

## Before the window

- [ ] **Prerequisite (required):** the current `develop`, including ODY-582 (Strapi 4.26.2) and ODY-659 (null-droplet guards), was released to `production` and is stable **before** the ODY-633 PR merged to `develop`.
- [ ] **Release freeze:** since ODY-633 landed on `develop` there have been no `develop` to `production` merges. Any normal prod deploy would run the D&P switch without this playbook. Comms announces the freeze to the team.
- [ ] **Strapi version check:** if `@strapi/strapi` on `production` differs from the version checked in the ODY-633 plan (4.25.24 and 4.26.2 checked), make sure `dist/migrations/draft-publish.js` and the `beforeSync` → `db.schema.sync()` order in `dist/Strapi.js` haven't changed.
- [ ] **Dev done first:** the ODY-633 steps have run on dev and dev has been smoke-checked afterwards. On dev: admin edit freeze, fresh `pg_dump` outside the repo (for example `~/ody-633/dev-pre-02-<date>.dump`) as rollback, dev backend scaled to 0 (`<dev-cluster>` / `<dev-backend-service>`), audit → handling → audit shows 0 → merge to `develop` → wait for the new task definition to be `PRIMARY` → scale back up. `dev2-image-push.yml` sets no desired count, so scale up by hand.
- [ ] **Prod copy audit:** restore a copy of prod locally and run `scripts/ody-633/01-audit.sql`. Save the output **outside the repo**.
- [ ] **Per-row decisions:** for every unpublished row, pick **keep and hide** (the default) or **delete** (only for rows the audit shows nothing points at). Write `~/ody-633/02-handle-unpublished.prod.sql` (outside the repo). The Reviewer signs off.
- [ ] **Rehearsal on the prod copy:** run `psql -v ON_ERROR_STOP=1 -v expected_db=<local prod-copy db name> -f ~/ody-633/02-handle-unpublished.prod.sql`, then `01` (0 unpublished), boot the D&P-off backend, run `03`, and smoke-check.
- [ ] **Window scheduled:** Comms announces the window and the **Strapi admin edit freeze** (Slack is enough).
- [ ] **Access check:** the Driver can run `psql` against prod RDS, create RDS snapshots, and update the prod ECS backend service.

## In the window

The prod pipeline (`prod-image-push.yml`) deploys the frontend and backend **in parallel as a rolling update** as soon as anything is pushed to `production`. Old backend tasks fail once the new one drops `published_at`. So the backend is scaled to 0 **before** merging, for a short, clean outage. **The outage starts at step 3 ("Backend to 0")** and ends at step 9. **Run no `terraform apply` from step 3 until step 9:** `terraform/modules/ecs/main.tf` hard-codes the backend `desired_count = 1`, so an apply would bring the backend back up early.

1. [ ] **Freeze on.** Comms confirms that no one is editing in the Strapi admin.
2. [ ] **Snapshot.** Take a manual RDS snapshot of prod and wait until it's `available`.
       `aws rds create-db-snapshot --db-instance-identifier <prod-db> --db-snapshot-identifier ody-633-pre-<date>`
3. [ ] **Backend to 0.** Scale the prod backend service to 0 tasks and wait until 0 are running, so nothing is writing while `02` and the gate run.
       `aws ecs update-service --cluster <prod-cluster> --service <prod-backend-service> --desired-count 0`
4. [ ] **Audit.** Run `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/01-audit.sql` on prod and save the output. The publish-permissions query (query 4) is needed for rollback.
5. [ ] **Diff against the rehearsal.** Are there any unpublished rows that weren't in the prod-copy audit? If so, **stop** and decide them with the Reviewer before continuing (scale back up to abort, see Rollback). Also re-check `01` section 3a for every delete-decision id: if any has gained a dependent, switch it to keep, or stop.
6. [ ] **Handle.** Run `psql -v ON_ERROR_STOP=1 -v expected_db=<prod db name> -f ~/ody-633/02-handle-unpublished.prod.sql`. It's a single transaction and rolls back if any unpublished row remains.
7. [ ] **Gate.** Run `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/01-audit.sql` again and save the output. **Every unpublished count must be 0.** If it isn't, stop. This run is the baseline for step 10.
8. [ ] **Merge to `production`.** Merge exactly `<ODY-633 merge SHA>` (record it in the window notes); nothing else goes in this merge. The pipeline registers the new task definitions and updates both services. The backend stays at 0.
9. [ ] **Backend up.** Scale up only after the pipeline's "Update ECS service" step has finished **and** `aws ecs describe-services --cluster <prod-cluster> --services <prod-backend-service>` shows the new task definition ARN as the `PRIMARY` deployment. Otherwise the old D&P-on task definition boots next to the new one. Then scale back to 1 task (the Terraform `desired_count`) and watch the logs for a clean boot.
       `aws ecs update-service --cluster <prod-cluster> --service <prod-backend-service> --desired-count 1`
10. [ ] **Verify.** Run `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/03-post-switch-verify.sql`. Check that:
    - the totals equal the step 7 gate run's totals exactly;
    - `published_at` is gone;
    - there are 0 publish permissions;
    - the orphan counts are unchanged.
11. [ ] **Smoke-check** as staff and as a normal user:
    - explore
    - a droplet and a lesson page
    - a playlist
    - a voyage
    - a profile
    - a group with due dates
    - the admin dashboard
    - the Strapi admin: there's no Publish button, and saves go live
12. [ ] **Freeze off.** Comms announces that the window has ended.

## Rollback

Choose a rollback path by what went wrong:

- **The new backend won't boot, or the app is broken, but no data was lost:** on a branch off `production`, run `git revert -m 1 <ODY-633 merge commit>`. Don't revert the whole release merge. Merge it using the same sequence as the window: backend to 0 → merge the revert → wait for the new task definition to be `PRIMARY` → scale up. Otherwise the revert's rolling update overlaps D&P-on and D&P-off tasks.
  - Strapi turns D&P back on and sets `published_at = created_at` on every row, so nothing is lost.
  - Run `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/04-reenable-check.sql` to confirm.
  - Publish permissions for roles other than Super Admin **don't come back**. Re-grant them in Strapi admin → Settings → Roles, using the query 4 output from step 4.
- **Rows were deleted that shouldn't have been:** restore them from the step 2 snapshot, into a side instance and then copy the rows back, or do a full restore if the damage is wide. Then follow the path above if the code also needs reverting.
- **Before step 8:** nothing has been deployed, but the backend is already down. Abort by scaling back up with the old task definition (`--desired-count 1`, the Terraform value). Rows changed by `02` can stay as they are, since they're hidden by Odyssey fields (except lessons, which have no hide field) and published under D&P. The ODY-633 plan explains why this is safe.

## After the window

- [ ] Record in ODY-633: audit counts before and after, deletes, and anything unexpected. Include **no real user data**.
- [ ] Delete saved audit output that holds prod data once it's no longer needed for rollback.
- [ ] Tell the team how to take content down now that Strapi's Publish/Unpublish is gone:
  - **Emergency:** delete the entry in the Strapi admin. This is permanent; ODY-659 keeps pages from crashing on the broken links.
  - **Routine:** set `isHidden` (droplets), `isPublic=false` (playlists) or `status=draft` (voyages). Hidden droplets are removed from listings but stay reachable by URL until [ODY-660](https://linear.app/aiil/issue/ODY-660) ships, while private playlists (`isPublic=false`) are reachable only by enrolled users.
