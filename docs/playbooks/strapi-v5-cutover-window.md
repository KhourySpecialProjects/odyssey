# Strapi v5 Cutover Window

The checklist for the combined v4 → v5 cutover (ODY-633 + ODY-597). Run it on **dev** first (phase 4), then on **prod** (M). The timeline, roles and background are in [strapi-prod-migration-day.md](strapi-prod-migration-day.md). If anything goes wrong, use [strapi-v5-rollback.md](strapi-v5-rollback.md).

**Why the steps are in this order:** the first v5 boot deletes every row where `published_at IS NULL`, then runs a one-way migration. So `01` and `02` must run on the v4 data **before** the merge, and the only way back is to **put back a pre-migration copy of the database**: the frozen copy (step 7a), the dump (step 3b) or the snapshot (step 2). A `git revert` by itself doesn't undo the migration.

Scripts: `scripts/strapi-v5-cutover/unpublished-rows/` (`01`, `02`, `03`), `scripts/strapi-v5-cutover/rollback/` (fingerprint and frozen copy) and `scripts/strapi-v5-cutover/api-smoke/`. Save every output under `~/ody-596/`, outside the repo; it holds real data.

## Dev vs prod

|             | Dev                                                                                    | Prod                                                          |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Merge       | `feature/strapi-v5` → `develop`                                                        | `develop` → `production`                                      |
| Pipeline    | `dev2-image-push.yml`                                                                  | `prod-image-push.yml`                                         |
| `02` file   | `scripts/strapi-v5-cutover/unpublished-rows/02-handle-unpublished.sql` (dev decisions) | `~/ody-633/02-handle-unpublished.prod.sql` (outside the repo) |
| Database    | dev RDS, PG 16.13                                                                      | prod RDS, PG 18                                               |
| Edit freeze | Tell the team in Slack                                                                 | Comms announces it ahead of time                              |

Both pipelines deploy the frontend and backend at the same time as soon as the merge lands. Neither one sets a task count, so you scale the backend up by hand.

In the commands, replace `<cluster>`, `<backend-service>`, `<frontend-service>`, `<db-instance>`, `<db>`, `<backend-url>` and the ECR repo names with the values for the environment you're working in.

## Database access

Both RDS instances are private. ECS Exec doesn't work (the task roles have no `ssmmessages` permissions), so reach them through a temporary jump instance and an SSM port-forward. Set it up before step 1 and keep it until the window or rollback is over.

|                 | Dev                                                                       | Prod                                      |
| --------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| `<db-instance>` | `odyssey-dev2`                                                            | `odyssey-production-db`                   |
| Subnet          | `subnet-0018b75c008fbacc8` (public)                                       | `subnet-0260f87c888e5b09a` (private, NAT) |
| Security groups | `sg-08f7dd705233d47f0` (`ec2-rds-1`) + `sg-06addef9076022b35` (`default`) | `sg-0a6086eb97f271182` (backend)          |
| Public IP       | `--associate-public-ip-address`                                           | `--no-associate-public-ip-address`        |

1. [ ] **Launch the jump instance** (profile `jumpbox-ssm`; no inbound rules or SSH key needed):
       `AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 --query Parameter.Value --output text)`
       `ID=$(aws ec2 run-instances --image-id $AMI --instance-type t4g.nano --subnet-id <subnet> <public-ip flag> --security-group-ids <security groups> --iam-instance-profile Name=jumpbox-ssm --metadata-options HttpTokens=required --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ody-<env>-db-jump}]' --query 'Instances[0].InstanceId' --output text)`
       Wait until `aws ssm describe-instance-information --filters Key=InstanceIds,Values=$ID --query "InstanceInformationList[].PingStatus"` prints `Online`.
2. [ ] **Open the tunnel** in its own terminal and leave it running:
       `DBHOST=$(aws rds describe-db-instances --db-instance-identifier <db-instance> --query "DBInstances[0].Endpoint.Address" --output text)`
       `aws ssm start-session --target $ID --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["'"$DBHOST"'"],"portNumber":["5432"],"localPortNumber":["15432"]}'`
3. [ ] **Point `psql` at it.** Every `psql`/`pg_dump` command in this checklist relies on these. Use the PostgreSQL 18 client tools (`/opt/homebrew/opt/postgresql@18/bin`); older ones can't dump or read a newer server.
       `export PGHOST=127.0.0.1 PGPORT=15432 PGUSER=<db user> PGDATABASE=<db>`, with the password in `~/.pgpass` (from the backend's `DATABASE_*` secret).
       Check: `psql -c "select version(), current_user;"`
4. [ ] **Keep the tunnel alive.** Session Manager ends a port-forward after about 20 minutes with no traffic. Run this in a spare terminal for the whole window:
       `while true; do psql -qAt -c "select 1" >/dev/null && date +"%H:%M tunnel ok"; sleep 240; done`
       If the tunnel still drops ("timed out due to inactivity"), run step 2 again; the jump instance keeps running. Don't change Session Manager's idle timeout, which applies to the whole account.
5. [ ] **After the window**, stop the tunnel and terminate the instance: `aws ec2 terminate-instances --instance-ids $ID`.

## Numbers from the rehearsal (ODY-602)

Fill these in before the window. Step 11 and the decision point use them.

- [ ] `T_mig`, the time the migration took (3.3): \_\_\_\_
- [ ] `T_rb`, the time the rollback took (3.6): \_\_\_\_
- [ ] The number of API smoke checks that passed (3.4): \_\_\_\_
- [ ] Window end time: \_\_\_\_
- [ ] **Rollback deadline** = window end − `T_rb` − 15 min: \_\_\_\_

## Before the window

- [ ] Dev: gate C has passed. Prod: the M−1 go/no-go (gate E) has passed.
- [ ] The `02` file for this environment is ready. For prod, the Reviewer has signed it off.
- [ ] Start the [window notes](#window-notes) and record the exact merge SHA. Keep the notes outside the repo.
- [ ] **Tag the current v4 images.** The pipelines push only `:latest`, so after the merge the old task definitions would pull the v5 image. Do this for the backend and the frontend repo:
  ```
  MANIFEST=$(aws ecr batch-get-image --repository-name <repo> --image-ids imageTag=latest --query 'images[0].imageManifest' --output text)
  aws ecr put-image --repository-name <repo> --image-tag v4-pre-v5-<date> --image-manifest "$MANIFEST"
  ```
- [ ] **Register the rollback task definitions.** Make a copy of the current backend and frontend task definitions with the image set to `:v4-pre-v5-<date>`. Record both ARNs in the window notes.
- [ ] Check that the backend's health-check grace period is longer than `T_mig`. If it isn't, ECS can kill the task in the middle of the migration. Ask the infra owner to raise it (agents can't change `terraform/`).
      `aws ecs describe-services --cluster <cluster> --services <backend-service> --query 'services[0].healthCheckGracePeriodSeconds'`
- [ ] Check that the RDS instance has free storage of at least twice the database size, for the frozen copy (step 7a):
      `SELECT pg_size_pretty(pg_database_size('<db>'));`, compared with CloudWatch `FreeStorageSpace`.
- [ ] Check access: `psql` to the RDS through the [database access](#database-access) tunnel (the role needs `CREATEDB` and membership in the database owner role, to make the frozen copy and to swap it back), RDS snapshots, ECS service updates, CloudWatch logs, ECR and the media bucket.
- [ ] Get a full-access API token ready for the API smoke script.
- [ ] Check out the merge SHA and run `cd frontend && npm ci`. The smoke script builds its queries from this checkout.

## Window notes

One file, outside the repo, that the Driver fills in as the window goes. The [rollback checklist](strapi-v5-rollback.md) reads every value from it.

- Environment; `<cluster>`, `<backend-service>` and `<frontend-service>`; the frontend's normal task count
- `<db>`, its owner, and the frozen copy's name `<db>_v4_frozen`
- The merge SHA, the `v4-pre-v5-<date>` tag, and the backend and frontend rollback task definition ARNs
- The rehearsal numbers above and the rollback deadline
- The T0 snapshot id (step 2), and the dump path and its sha256 (step 3b)
- The fingerprint files: T0 (step 3a), the copy check (step 7b) and after v5 (step 12)
- The media bucket and the T0 media listing file (step 3c)
- `T0` (window start) and `T_open` (step 15), both in UTC
- Who the Driver, Reviewer, Comms and Rollback approver are

## In the window

The outage runs from step 3 to step 15. **Don't run `terraform apply` during the window.** Terraform sets the backend `desired_count = 1`, so an apply would start the backend too early.

1. [ ] **Freeze on.** Make sure no one is editing in the Strapi admin.
2. [ ] **Snapshot.** Take an RDS snapshot and wait until it's `available`.
       `aws rds create-db-snapshot --db-instance-identifier <db-instance> --db-snapshot-identifier ody-v5-pre-<date>`
3. [ ] **Backend to 0.** Wait until 0 tasks are running.
       `aws ecs update-service --cluster <cluster> --service <backend-service> --desired-count 0`
   - [ ] **3a. T0 fingerprint.** `flavor` must be `v4`.
         `psql -d <db> -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/<env>-fp-T0-<date>.txt`
   - [ ] **3b. Dump.** Check it's readable, then record its path and sha256 in the window notes.
         `pg_dump -Fc -d <db> -f ~/ody-596/<env>-T0-<date>.dump`
         `pg_restore --list ~/ody-596/<env>-T0-<date>.dump > /dev/null && shasum -a 256 ~/ody-596/<env>-T0-<date>.dump`
   - [ ] **3c. Media listing.**
         `aws s3 ls s3://<media-bucket> --recursive > ~/ody-596/<env>-s3-T0-<date>.txt`
4. [ ] **Audit.** Save the output. Query 4 is the baseline for step 12.
       `psql -v ON_ERROR_STOP=1 -f scripts/strapi-v5-cutover/unpublished-rows/01-audit.sql`
5. [ ] **Compare with the rehearsal.** Are there unpublished rows that the rehearsal didn't have? Has any row marked for delete gained a dependent (section 3a)? If so, **stop** and decide with the Reviewer, or abort.
6. [ ] **Handle.** This runs as one transaction and rolls back on any error.
       `psql -v ON_ERROR_STOP=1 -v expected_db=<db> -f <02 file>`
7. [ ] **Gate.** Run `01` again and save the output. **Every unpublished count must be 0.** If it isn't, stop. This run is the baseline for step 12.
   - [ ] **7a. Frozen copy.** This is the copy a rollback swaps back to. If the script warns that `datacl` or settings differ, re-apply them to the copy now.
         `psql -d postgres -v src=<db> -v frozen=<db>_v4_frozen -f scripts/strapi-v5-cutover/rollback/clone-frozen.sql`
   - [ ] **7b. Copy check.** Fingerprint both databases. Both `flavor`s must be `v4`, and section 4 must diff clean. If not, investigate for up to 10 minutes, then abort ([Path A](strapi-v5-rollback.md#path-a-abort-the-database-is-untouched)).
         `psql -d <db> -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/<env>-fp-gate-<date>.txt`
         `psql -d <db>_v4_frozen -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/<env>-fp-copycheck-<date>.txt`
         `diff <(sed -n '/== 4\./,$p' ~/ody-596/<env>-fp-gate-<date>.txt) <(sed -n '/== 4\./,$p' ~/ody-596/<env>-fp-copycheck-<date>.txt)`
8. [ ] **Merge.** Merge exactly the recorded SHA. Nothing else goes in.
9. [ ] **Wait for the pipeline.** Both "Update ECS service" steps must finish. Then check that the new backend task definition is `PRIMARY`:
       `aws ecs describe-services --cluster <cluster> --services <backend-service> --query "services[0].deployments[?status=='PRIMARY'].taskDefinition"`
10. [ ] **Backend to 1.**
        `aws ecs update-service --cluster <cluster> --service <backend-service> --desired-count 1`
11. [ ] **Wait for the migration.** In the backend logs, look for `[discard-drafts] Migration completed successfully` and then `Strapi started successfully`. If the second line hasn't appeared by boot + 2 × `T_mig`, **roll back**.
12. [ ] **Verify the database.**
        `psql -v ON_ERROR_STOP=1 -f scripts/strapi-v5-cutover/unpublished-rows/03-post-switch-verify.sql`
    - [ ] Section 1: `before_v5_boot` equals the step 7 totals.
    - [ ] Section 2: no migrations missing.
    - [ ] Section 3: every count is 0.
    - [ ] Section 4: equals step 4's query 4 output without the Super Admin rows.
    - [ ] Section 5: orphan counts are unchanged from step 7.
    - [ ] Fingerprint: `flavor` is `v5`. Save it as the after-v5 fingerprint.
          `psql -d <db> -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/<env>-fp-after-v5-<date>.txt`
13. [ ] **API smoke.** Don't set `ODY635_WRITES`; the run must stay read-only. The pass count must match the rehearsal.
        `ODY635_TOKEN=<token> STRAPI_URL=<backend-url> scripts/strapi-v5-cutover/api-smoke/smoke-queries.sh`
14. [ ] **Manual smoke check**, as staff and as a normal user:
    - [ ] explore
    - [ ] a droplet and a lesson page
    - [ ] a playlist
    - [ ] a voyage
    - [ ] a profile
    - [ ] a group with due dates
    - [ ] the admin dashboard
    - [ ] edit and save a droplet from the frontend (this is the ODY-700 path)
    - [ ] the Strapi admin: there's no Publish button, saves go live, and `status` can be edited on droplets and voyages (ODY-699)
15. [ ] **Go / no-go.** Go: freeze off, record `T_open` (UTC) in the window notes, and Comms announces the end of the window. No-go: [roll back](#rollback).

The ODY-700 script (`smoke-regenerate-slug.sh`) renames real entries and is for scratch databases only. It runs in the rehearsal, not here. Step 14's droplet edit covers that path.

## Decision point

**Roll back right away** if:

- `03` section 1 shows lost rows (`before_v5_boot` is lower than the gate);
- `03` section 3 shows duplicate `document_id`s, which means D&P was on in the image;
- the backend crashes during the migration.

**Roll back at the rollback deadline** if any of these is still broken and there's no fix ready:

- the backend hasn't logged `Strapi started successfully`;
- `03` has a failing section;
- the API smoke has more failures than the rehearsal;
- a manual smoke check item is broken and can't be fixed within 15 minutes.

Small issues with a known fix (copy, a single page) don't need a rollback. File them and link them to ODY-603.

## Rollback

Follow the [rollback checklist](strapi-v5-rollback.md), with the values from the [window notes](#window-notes). Keep the freeze on until it's done. Which path depends on how far the window got:

- **Before step 10** (v5 hasn't started): [Path A, abort](strapi-v5-rollback.md#path-a-abort-the-database-is-untouched). The database is still v4, and the changes from `02` can stay.
- **After step 10** (v5 has started): [Path B, swap back](strapi-v5-rollback.md#path-b-swap-back-to-the-frozen-copy) to the step 7a frozen copy. Use [Path C](strapi-v5-rollback.md#path-c-restore-from-the-dump) (the step 3b dump) if the frozen copy is missing or fails its check, and [Path D](strapi-v5-rollback.md#path-d-restore-the-snapshot-to-a-new-server) (the step 2 snapshot) only if the database server is unusable.

Every path ends by reverting the merge on the branch (`develop` or `production`), so the next push doesn't deploy v5 again.
