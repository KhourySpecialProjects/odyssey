# Strapi Prod Migration Day Playbook

A checklist for the engineers running a Strapi migration against **production**: what to prepare, what to run during the maintenance window, and how to roll back. Work through it top to bottom and tick each box as you go.

Right now this playbook covers **ODY-633: turning off Draft & Publish**. The Strapi v5 upgrade (ODY-597, rehearsed in ODY-602) will add its own sections here when it's planned. Background and reasoning live in [docs/plans/ODY-633.md](../plans/ODY-633.md). This page is only the steps.

> **Why this needs a window.** On the first boot with Draft & Publish (D&P) off, Strapi v4 permanently **deletes every row where `published_at IS NULL`**, then drops the `published_at` column. This happens before any migration runs, so it can't be fixed in code. Every such row has to be handled by hand in SQL _before_ the new backend boots.

## Roles

| Role     | Who   | Does                                                                       |
| -------- | ----- | -------------------------------------------------------------------------- |
| Driver   | _TBD_ | Runs the SQL and AWS steps, and makes the go/no-go calls                   |
| Reviewer | _TBD_ | Reviews the per-row decisions and the prod handling SQL before the window  |
| Comms    | _TBD_ | Announces the window and the admin edit freeze, and confirms when both end |

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
