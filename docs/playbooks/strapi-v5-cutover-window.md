# Strapi v5 Cutover Window

The checklist for the combined v4 → v5 cutover (ODY-633 + ODY-597). Run it on **dev** first (phase 4), then on **prod** (M). The timeline, roles and background are in [strapi-prod-migration-day.md](strapi-prod-migration-day.md).

**Why the steps are in this order:** the first v5 boot deletes every row where `published_at IS NULL`, then runs a one-way migration. So `01` and `02` must run on the v4 data **before** the merge, and the only way back is to **restore the snapshot**. A `git revert` by itself doesn't undo the migration.

## Dev vs prod

|             | Dev                                                         | Prod                                                          |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Merge       | `feature/strapi-v5` → `develop`                             | `develop` → `production`                                      |
| Pipeline    | `dev2-image-push.yml`                                       | `prod-image-push.yml`                                         |
| `02` file   | `scripts/ody-633/02-handle-unpublished.sql` (dev decisions) | `~/ody-633/02-handle-unpublished.prod.sql` (outside the repo) |
| Database    | dev RDS, PG 16.13                                           | prod RDS, PG 18                                               |
| Edit freeze | Tell the team in Slack                                      | Comms announces it ahead of time                              |

Both pipelines deploy the frontend and backend at the same time as soon as the merge lands. Neither one sets a task count, so you scale the backend up by hand.

In the commands, replace `<cluster>`, `<backend-service>`, `<frontend-service>`, `<db-instance>`, `<db>`, `<backend-url>` and the ECR repo names with the values for the environment you're working in.

## Numbers from the rehearsal (ODY-602)

Fill these in before the window. Step 11 and the decision point use them.

- [ ] `T_mig`, the time the migration took (3.3): \_\_\_\_
- [ ] `T_rb`, the time the rollback took (3.6): \_\_\_\_
- [ ] The number of ODY-635 smoke checks that passed (3.4): \_\_\_\_
- [ ] Window end time: \_\_\_\_
- [ ] **Rollback deadline** = window end − `T_rb` − 15 min: \_\_\_\_

## Before the window

- [ ] Dev: gate C has passed. Prod: the M−1 go/no-go (gate E) has passed.
- [ ] The `02` file for this environment is ready. For prod, the Reviewer has signed it off.
- [ ] Record the exact merge SHA in the window notes. Keep the notes outside the repo.
- [ ] **Tag the current v4 images.** The pipelines push only `:latest`, so after the merge the old task definitions would pull the v5 image. Do this for the backend and the frontend repo:
  ```
  MANIFEST=$(aws ecr batch-get-image --repository-name <repo> --image-ids imageTag=latest --query 'images[0].imageManifest' --output text)
  aws ecr put-image --repository-name <repo> --image-tag v4-final --image-manifest "$MANIFEST"
  ```
- [ ] **Register the rollback task definitions.** Make a copy of the current backend and frontend task definitions with the image set to `:v4-final`. Record both ARNs in the window notes.
- [ ] Check that the backend's health-check grace period is longer than `T_mig`. If it isn't, ECS can kill the task in the middle of the migration. Ask the infra owner to raise it (agents can't change `terraform/`).
      `aws ecs describe-services --cluster <cluster> --services <backend-service> --query 'services[0].healthCheckGracePeriodSeconds'`
- [ ] Check access: `psql` to the RDS, RDS snapshots, ECS service updates, CloudWatch logs and ECR.
- [ ] Get a full-access API token ready for the ODY-635 smoke script.
- [ ] Check out the merge SHA and run `cd frontend && npm ci`. The smoke script builds its queries from this checkout.

## In the window

The outage runs from step 3 to step 15. **Don't run `terraform apply` during the window.** Terraform sets the backend `desired_count = 1`, so an apply would start the backend too early.

1. [ ] **Freeze on.** Make sure no one is editing in the Strapi admin.
2. [ ] **Snapshot.** Take an RDS snapshot and wait until it's `available`.
       `aws rds create-db-snapshot --db-instance-identifier <db-instance> --db-snapshot-identifier ody-v5-pre-<date>`
3. [ ] **Backend to 0.** Wait until 0 tasks are running.
       `aws ecs update-service --cluster <cluster> --service <backend-service> --desired-count 0`
4. [ ] **Audit.** Save the output. Query 4 is the baseline for step 12.
       `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/01-audit.sql`
5. [ ] **Compare with the rehearsal.** Are there unpublished rows that the rehearsal didn't have? Has any row marked for delete gained a dependent (section 3a)? If so, **stop** and decide with the Reviewer, or abort.
6. [ ] **Handle.** This runs as one transaction and rolls back on any error.
       `psql -v ON_ERROR_STOP=1 -v expected_db=<db> -f <02 file>`
7. [ ] **Gate.** Run `01` again and save the output. **Every unpublished count must be 0.** If it isn't, stop. This run is the baseline for step 12.
8. [ ] **Merge.** Merge exactly the recorded SHA. Nothing else goes in.
9. [ ] **Wait for the pipeline.** Both "Update ECS service" steps must finish. Then check that the new backend task definition is `PRIMARY`:
       `aws ecs describe-services --cluster <cluster> --services <backend-service> --query "services[0].deployments[?status=='PRIMARY'].taskDefinition"`
10. [ ] **Backend to 1.**
        `aws ecs update-service --cluster <cluster> --service <backend-service> --desired-count 1`
11. [ ] **Wait for the migration.** In the backend logs, look for `[discard-drafts] Migration completed successfully` and then `Strapi started successfully`. If the second line hasn't appeared by boot + 2 × `T_mig`, **roll back**.
12. [ ] **Verify the database.**
        `psql -v ON_ERROR_STOP=1 -f scripts/ody-633/03-post-switch-verify.sql`
    - [ ] Section 1: `before_v5_boot` equals the step 7 totals.
    - [ ] Section 2: no migrations missing.
    - [ ] Section 3: every count is 0.
    - [ ] Section 4: equals step 4's query 4 output without the Super Admin rows.
    - [ ] Section 5: orphan counts are unchanged from step 7.
13. [ ] **API smoke.** Don't set `ODY635_WRITES`; the run must stay read-only. The pass count must match the rehearsal.
        `ODY635_TOKEN=<token> STRAPI_URL=<backend-url> scripts/ody-635/smoke-queries.sh`
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
15. [ ] **Go / no-go.** Go: freeze off, and Comms announces the end of the window. No-go: [roll back](#rollback).

The ODY-700 script (`smoke-regenerate-slug.sh`) renames real entries and is for scratch databases only. It runs in the rehearsal, not here. Step 14's droplet edit covers that path.

## Decision point

**Roll back right away** if:

- `03` section 1 shows lost rows (`before_v5_boot` is lower than the gate);
- `03` section 3 shows duplicate `document_id`s, which means D&P was on in the image;
- the backend crashes during the migration.

**Roll back at the rollback deadline** if any of these is still broken and there's no fix ready:

- the backend hasn't logged `Strapi started successfully`;
- `03` has a failing section;
- the ODY-635 smoke has more failures than the rehearsal;
- a manual smoke check item is broken.

Small issues with a known fix (copy, a single page) don't need a rollback. File them and link them to ODY-602.

## Rollback

**Before step 8 (abort):** nothing has been deployed. Scale the backend back to 1 on the current v4 task definition. The changes from `02` can stay as they are.

**After step 8:** restore the snapshot. Any content created after step 10 is lost, so keep the freeze on.

1. [ ] Backend to 0.
2. [ ] Restore the step 2 snapshot by following the ODY-596 runbook (task 2.1).
3. [ ] Point both services at the rollback task definitions:
       `aws ecs update-service --cluster <cluster> --service <backend-service> --task-definition <backend rollback ARN> --desired-count 1`
       `aws ecs update-service --cluster <cluster> --service <frontend-service> --task-definition <frontend rollback ARN>`
4. [ ] Smoke-check the site on v4 (step 14, minus the v5-only admin checks).
5. [ ] Revert the merge on the branch (`develop` or `production`). Without the revert, the next push to that branch deploys v5 onto the restored v4 database. The revert's own deploy is v4 on v4, so it's safe.
6. [ ] Freeze off. Comms announces the rollback.
7. [ ] Record what failed in ODY-602. Include **no real user data**.
