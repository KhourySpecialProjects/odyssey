# Strapi v5 Rollback Checklist

What to do when the Strapi v5 cutover goes wrong and we need to go back to Strapi v4. Work top to bottom and tick each box. It applies to prod and dev; for dev, use the dev names and branch (`develop` instead of `production`).

This page is steps only. The reasoning is in the Linear ticket [ODY-596](https://linear.app/aiil/issue/ODY-596). The cutover itself is in the [migration-day playbook](strapi-prod-migration-day.md).

## Have these in hand first

The Driver writes these down in the window notes at the start of the window. If any value is missing, find it before you go further.

- [ ] Environment, `<cluster>`, `<backend-service>` and `<frontend-service>` names, and the frontend's normal task count
- [ ] Database name `<db>` and the frozen copy's name `<db>_v4_frozen`
- [ ] **Rollback task definition ARNs** for the backend and the frontend. These are pinned to the v4 images (tagged `v4-pre-v5-<date>`).
- [ ] The T0 RDS snapshot id, the dump file path and its sha256
- [ ] The two fingerprint files: T0 (before any changes) and the copy check (taken right after the frozen copy was made)
- [ ] `T_open`: the time the site reopened, in UTC. Leave it blank if the site hasn't reopened yet.
- [ ] Media bucket name and the T0 media listing file
- [ ] Who the Driver and the Rollback approver are

All `psql` commands assume `PGHOST`, `PGUSER` and `PGPASSWORD` point at the RDS instance, using PG 18 client tools. The `scripts/ody-596/` scripts must exist (ODY-596 Tasks 1–3). If they don't, this checklist isn't ready to use.

## Rules that always apply

1. **Never start the v4 backend on a database that v5 has run on.** v4 won't refuse to start. It silently erases every link between records: lessons in droplets, droplets in voyages, enrollments, group members. Always swap or restore the database first.
2. **The frontend and backend go back together.** The v5 frontend can't save anything to v4, and the v4 frontend can't save anything to v5.
3. **Never just scale the backend up.** Always deploy the rollback task definition. The pipeline only uses the `:latest` image, and `:latest` is now v5.
4. **Watch every v4 deploy until it's healthy.** If the v4 backend tasks keep failing to start, scale the backend to 0 immediately. ECS automatically rolls back failed deploys to the previous deployment, which is v5, and v5 would migrate the database you just put back.
5. No `terraform apply` until 24h after the site reopened. It resets the task counts.
6. Nobody runs the local Docker stack (`docker compose up`). It may be pointed at prod.
7. **Delete nothing without explicit approval.** That covers the failed database, the frozen copy, the snapshot and the dump.

## 1. Decide whether to roll back

**Before the site reopens:** the Driver decides. Rolling back loses nothing. Roll back if any of these happen:

- [ ] v5's first start doesn't finish within the boot limit in the window notes, or the logs show a migration error. Don't retry in the same window.
- [ ] After the migration, the row-count check shows differences the rehearsal didn't, or the v5 `03` check fails, or a smoke script reports a FAIL.
- [ ] A smoke-test item fails and can't be fixed within 15 minutes.
- [ ] The hard deadline in the window notes passes and things still aren't green. Roll back no matter what.

**After the site reopens, for up to 24 hours:** the Rollback approver must sign off. Users' new work since reopening will be lost. Roll back if any of these happen:

- [ ] **Any sign of wrong or missing data**, such as missing lessons, broken voyages or missing enrollments. Always roll back for this.
- [ ] A role can't sign in for 30 minutes, with no fix in sight.
- [ ] Enrollments or progress fail to save for many users.
- [ ] Staff can't edit content or upload media, with no fix by end of business day.
- [ ] Backend 5xx errors stay above twice the normal level for 30 minutes.

If no data is damaged and a code fix can ship within about 2 hours, prefer fixing forward.

**More than 24 hours after reopening:** don't roll back. Fix forward only.

- [ ] **Write down** the time (UTC), what triggered the rollback, and who approved it.

## 2. Pick the path

| Situation                                                 | Path                                        |
| --------------------------------------------------------- | ------------------------------------------- |
| The v5 backend hasn't started yet                         | **A. Abort**                                |
| The v5 backend has started at least once                  | **B. Swap back** (the normal case)          |
| Path B, but the frozen copy is missing or fails its check | **C. Restore from the dump**                |
| The database server itself is down or unusable            | **D. Restore the snapshot to a new server** |

If you're not sure whether v5 has started, run `psql -d <db> -f scripts/ody-596/fingerprint.sql`. If `flavor` is `v4`, use Path A. If it's `v5` or `PARTIAL`, use Path B.

## Path A: Abort (the database is untouched)

- [ ] If the pipeline already deployed the new frontend, put the frontend back:
      `aws ecs update-service --cluster <cluster> --service <frontend-service> --task-definition <frontend rollback ARN>`
- [ ] Put the backend back. This is the rollback task definition, not a plain scale-up:
      `aws ecs update-service --cluster <cluster> --service <backend-service> --task-definition <backend rollback ARN> --desired-count 1`
- [ ] Watch until both are healthy (rule 4):
      `aws ecs wait services-stable --cluster <cluster> --services <backend-service> <frontend-service>`
- [ ] Run the [smoke test](#smoke-test).
- [ ] Go to [After every rollback](#after-every-rollback). The data is unchanged, so skip the re-entry and media steps.

## Path B: Swap back to the frozen copy

The rehearsal time is in the window notes. The swap itself takes seconds.

1. [ ] **Stop everything.** Scale the backend to 0. If the site has reopened, scale the frontend to 0 too, which stops new writes. Wait until 0 tasks are running.
       `aws ecs update-service --cluster <cluster> --service <backend-service> --desired-count 0`
2. [ ] **Close leftover database connections.** Run this connected to the `postgres` database:
       `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('<db>', '<db>_v4_frozen') AND pid <> pg_backend_pid();`
3. [ ] **Only if the site had reopened:** save the list of what changed since reopening. Re-entry needs it later.
       `psql -d <db> -v t_open='<T_open UTC>' -f scripts/ody-596/writes-since.sql > ~/ody-596/<env>-writes-since-<date>.txt`
4. [ ] **Check that the frozen copy is good.** `flavor` must be `v4`, and the counts must match the copy-check fingerprint file. If either is wrong, stop and go to Path C.
       `psql -d <db>_v4_frozen -f scripts/ody-596/fingerprint.sql`
5. [ ] **Swap.** This renames the broken database to `<db>_v5_failed` and the frozen copy to `<db>`:
       `psql -d postgres -v live=<db> -v frozen=<db>_v4_frozen -v failed=<db>_v5_failed -f scripts/ody-596/swap-back.sql`
6. [ ] **Check the live database.** `flavor` must be `v4`. The owner and settings the swap script printed must match the T0 fingerprint.
       `psql -d <db> -f scripts/ody-596/fingerprint.sql`
7. [ ] **Bring v4 back.** Deploy both rollback task definitions:
       `aws ecs update-service --cluster <cluster> --service <backend-service> --task-definition <backend rollback ARN> --desired-count 1`
       `aws ecs update-service --cluster <cluster> --service <frontend-service> --task-definition <frontend rollback ARN> --desired-count <normal count>`
8. [ ] **Watch until both are healthy** (rule 4). If the backend tasks keep failing, scale the backend to 0 now, before ECS brings v5 back.
9. [ ] Run the [smoke test](#smoke-test).
10. [ ] Go to [After every rollback](#after-every-rollback).

## Path C: Restore from the dump

Use this when the frozen copy is missing or broken. The restore time from the rehearsal is in the window notes. This puts back the data from the very start of the window, before the ODY-633 cleanup. That data is valid on v4.

1. [ ] Do Path B steps 1–3.
2. [ ] Check that the dump file is intact. The sha256 must match the window notes.
       `shasum -a 256 <dump file>`
3. [ ] Create an empty database and restore into it:
       `createdb <db>_v4_restored`
       `pg_restore --no-owner --role=<db owner> -j 4 -d <db>_v4_restored <dump file>`
4. [ ] Check it. `flavor` must be `v4`, and the counts must match the T0 fingerprint file.
       `psql -d <db>_v4_restored -f scripts/ody-596/fingerprint.sql`
5. [ ] Swap it in:
       `psql -d postgres -v live=<db> -v frozen=<db>_v4_restored -v failed=<db>_v5_failed -f scripts/ody-596/swap-back.sql`
6. [ ] Continue from Path B step 6.

## Path D: Restore the snapshot to a new server

Use this only when the database server itself can't be used. It's the slowest path, often 30 minutes or more.

1. [ ] If the database can still be reached, do Path B steps 1–3. If it can't, scale the backend and frontend to 0 and skip the rest of those steps.
2. [ ] Restore the T0 snapshot to a new instance, using the **same** subnet group, security groups and parameter group as the old one:
       `aws rds restore-db-instance-from-db-snapshot --db-instance-identifier <new-db-instance> --db-snapshot-identifier <T0 snapshot id> --db-subnet-group-name <subnet group> --vpc-security-group-ids <sg> --db-parameter-group-name <parameter group>`
3. [ ] Wait until it's `available`, then check it. `flavor` must be `v4`.
4. [ ] Point the backend at the new server: change `DATABASE_HOST` in the backend's Secrets Manager secret. Write the old value down first.
5. [ ] Continue from Path B step 7.
6. [ ] Tell the team the infrastructure now differs from terraform. Nobody runs `terraform apply` until that's sorted out.

## Smoke test

Check each of these as staff and as a normal user:

- [ ] Sign in, for each role
- [ ] Explore, plus a droplet page, a lesson page and a voyage page. Lessons show inside their droplets, and droplets inside their voyages.
- [ ] Enroll in something, and make progress on a lesson
- [ ] Edit a droplet in the app, and edit an entry in the Strapi admin
- [ ] Upload an image
- [ ] A group page with due dates, and the admin dashboard

## After every rollback

- [ ] **Freeze the branch.** Nobody pushes to `production` (dev: `develop`) until the next step lands. The next push would run the v5 migration again, without this checklist.
- [ ] **Revert the v5 merge.** The user runs `git revert -m 1 <v5 merge commit>` on `production` and pushes it. The pipeline rebuilds the v4 images, which is safe because the database is v4 again.
- [ ] **Announce it.** Comms says the site is back on the old version. If the site had reopened, also say that changes made between `<T_open>` and `<rollback time>` were lost.
- [ ] **Re-enter important work by hand,** using the writes-since report: staff content edits, new droplets and lessons, re-uploaded media, and group changes. Enrollments and progress are not re-entered; the announcement covers them.
- [ ] **Check media.** Compare the bucket with the T0 listing:
      `aws s3 ls s3://<media-bucket> --recursive > ~/ody-596/<env>-s3-after-rollback.txt`
      Files added during v5 are harmless and can stay. Files deleted during v5 break pages: restore them from S3 versioning.
- [ ] **Check sign-in.** If signed-in users get errors, follow the session fix decided in ODY-596 Q4. _(Not decided yet; the rehearsal tests it.)_
- [ ] **Keep everything.** Keep `<db>_v5_failed`, the snapshot and the dump until the cause is understood. Dropping any of them needs explicit approval.
- [ ] **Write it up** in ODY-603: the timeline, the trigger, how long each step took, and what broke. File a ticket for the cause. Include no real user data.
- [ ] **Before trying again:** run the whole cutover from the start, with a new frozen copy. After the next migration, restart the frontend, because v5 gives every record a new id each time it migrates.
