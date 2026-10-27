# Strapi v5 Cutover Window

The step-by-step runbook for the combined v4 → v5 cutover (ODY-633 + ODY-597). Run it on **dev** first (phase 4 of the [migration-day playbook](strapi-prod-migration-day.md)), then on **prod** (M). If anything goes wrong, use [strapi-v5-rollback.md](strapi-v5-rollback.md).

**Why the steps are in this order:** the first v5 boot deletes every row where `published_at IS NULL`, then runs a one-way migration. So `01` and `02` must run on the v4 data **before** the merge, and the only way back is to **put back a pre-migration copy of the database**: the frozen copy (step 7a), the dump (step 3b) or the snapshot (step 2). A `git revert` by itself doesn't undo the migration.

**How to use this page.** The window is split into phases; each phase says what it achieves, then lists its commands one block at a time with a note on what the command does and what to expect. Paste one block, check its output, then move on. The commands use the variables you set in [Phase 1](#phase-1-set-up-access-window-day-before-t0), so the same page works for dev and prod. Save every output under `~/ody-596/` (outside the repo; it holds real data) and record values in the [window notes](#window-notes).

**zsh tips:** don't add `# comments` after pasted commands (zsh passes them as arguments), never name a variable `HOST` (zsh uses it for your computer's name), and if a paste stops at `quote>` or `cmdsubst>`, press Ctrl+C and paste the whole block again.

| Phase                                                                                | Steps | What it achieves                                                         |
| ------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------ |
| [0. Prepare](#phase-0-prepare-days-before-the-window)                                | —     | Health check, grace period, v4 image tags, rollback task definitions, PR |
| [1. Set up access](#phase-1-set-up-access-window-day-before-t0)                      | —     | A tunnel to the database and a work terminal                             |
| [2. Freeze and take safety copies](#phase-2-freeze-and-take-safety-copies-steps-13c) | 1–3c  | No more writes; snapshot, dump and fingerprint (outage starts at step 3) |
| [3. Prepare the data](#phase-3-prepare-the-data-steps-47b)                           | 4–7b  | Unpublished rows handled; the frozen copy made                           |
| [4. Deploy v5](#phase-4-deploy-v5-steps-811)                                         | 8–11  | Merge, pipeline, first v5 boot (the one-way migration)                   |
| [5. Verify](#phase-5-verify-steps-1214)                                              | 12–14 | Nothing lost; the API and the site work                                  |
| [6. Reopen and close out](#phase-6-reopen-and-close-out-step-15)                     | 15    | Go/no-go, reopen, close the access                                       |

## Values for each environment

| Variable / item                         | Dev                                                                    | Prod                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ENV`                                   | `dev`                                                                  | `prod`                                                                  |
| Cluster `C`                             | `odyssey-dev2`                                                         | `production-cluster`                                                    |
| Backend service `BE`                    | `dev2-backend-service`                                                 | `production-backend`                                                    |
| Frontend service `FE`                   | `dev2-frontend-service`                                                | `production-frontend`                                                   |
| DB instance `DBI`                       | `odyssey-dev2` (PG 16.13)                                              | `odyssey-production-db` (PG 18.3)                                       |
| Database `DB` / user                    | `postgres` / `postgres`                                                | `odyssey` / `postgres`                                                  |
| Backend secret `SECRET`                 | `odyssey/dev/backend`                                                  | `odyssey/prod/backend`                                                  |
| Frontend secret `FSECRET` (smoke token) | `odyssey/dev/frontend` (key `STRAPI_ACCESS_TOKEN_DEV2`)                | `odyssey/prod/frontend` (key `STRAPI_ACCESS_TOKEN`)                     |
| Local tunnel port `PGPORT`              | `15432`                                                                | `15450`                                                                 |
| Backend public URL `STRAPI_URL`         | `https://dev.data.khouryodyssey.org`                                   | `https://data.khouryodyssey.org`                                        |
| Site host names                         | `dev.khouryodyssey.org`                                                | `khouryodyssey.org`, `www.khouryodyssey.org`                            |
| Backend log group `LOGS`                | `/ecs/task-odyssey-backend`                                            | `/ecs/production/backend`                                               |
| Backend ECR repo                        | `odyssey-dev2-ecs-backend`                                             | `odyssey-prod-backend`                                                  |
| Merge                                   | `feature/strapi-v5` → `develop`                                        | `develop` → `production`                                                |
| Pipeline                                | `dev2-image-push.yml`                                                  | `prod-image-push.yml` (rolling update)                                  |
| `02` file                               | `scripts/strapi-v5-cutover/unpublished-rows/02-handle-unpublished.sql` | `~/ody-633/02-handle-unpublished.prod.sql` (outside the repo, approved) |
| Jumpbox subnet                          | `subnet-0018b75c008fbacc8` (public)                                    | `subnet-0260f87c888e5b09a` (private, NAT)                               |
| Jumpbox security groups                 | `sg-08f7dd705233d47f0 sg-06addef9076022b35`                            | `sg-0a6086eb97f271182`                                                  |
| Jumpbox public IP flag                  | `--associate-public-ip-address`                                        | `--no-associate-public-ip-address`                                      |
| Edit freeze                             | Tell the team in Slack                                                 | Comms announces it ahead of time                                        |

Both pipelines deploy the frontend and backend as soon as the merge lands, and neither sets a task count, so you scale the backend up by hand. **Don't run `terraform apply` during the window, or until ODY-797 is done:** terraform is out of date and would undo the health check, the grace period and the task counts.

## Phase 0: Prepare (days before the window)

These change nothing users see. Do them early, with the Terminal B variables from Phase 1 set, and record the results in the window notes.

**0.1 The `02` file is ready.** Dev: in the repo. Prod: the Reviewer has signed off `~/ody-633/02-handle-unpublished.prod.sql`.

**0.2 The backend health check uses `/_health`.** v5 answers `/` with a 302, so a target group that checks `/` for a 200 makes ECS kill every v5 backend task. In the console: EC2 → Target groups → the backend's target group → **Health checks** → **Edit** → path `/_health`, success codes `200-204` → **Save**. Then check the target stays healthy for about 2 minutes:

```bash
TG=$(aws ecs describe-services --cluster $C --services $BE --query "services[0].loadBalancers[0].targetGroupArn" --output text)
for i in 1 2 3 4 5; do date +%H:%M:%S; aws elbv2 describe-target-health --target-group-arn $TG --query "TargetHealthDescriptions[].TargetHealth.State" --output text; sleep 30; done
```

Finds the backend's target group and prints its health every 30 s. Every line must say `healthy`. If one says `unhealthy`, set the path back to `/` and the success codes to `200`.

**0.3 The grace period covers the migration.**

```bash
aws ecs update-service --cluster $C --service $BE --health-check-grace-period-seconds 600 --query "service.healthCheckGracePeriodSeconds"
```

Tells ECS to ignore failed health checks for 10 minutes after a task starts, so a long migration isn't killed halfway (with 0, a task gets only ~35–65 s). It changes nothing about running tasks. Prints `600`. Lower it to 120 s after the cutover.

**0.4 Tag the running v4 images.** The pipelines only push `:latest`, so after the merge `:latest` is v5. A tag keeps a permanent name on today's v4 image.

```bash
for S in $BE $FE; do T=$(aws ecs list-tasks --cluster $C --service-name $S --desired-status RUNNING --query "taskArns[0]" --output text); aws ecs describe-tasks --cluster $C --tasks $T --query "tasks[0].containers[0].{service:'$S',image:image,digest:imageDigest}" --output table; done
```

Shows the image and the exact digest each service is running. Record both.

```bash
TAG=v4-pre-v5-<date>
MT='application/vnd.docker.distribution.manifest.v2+json application/vnd.docker.distribution.manifest.list.v2+json application/vnd.oci.image.manifest.v1+json application/vnd.oci.image.index.v1+json'
```

Sets the tag name and the image formats ECR may store, which the next commands need.

```bash
REPO=<repo>; DIGEST=<digest>
MANIFEST=$(aws ecr batch-get-image --repository-name $REPO --image-ids imageDigest=$DIGEST --accepted-media-types ${=MT} --query 'images[0].imageManifest' --output text)
MTYPE=$(aws ecr batch-get-image --repository-name $REPO --image-ids imageDigest=$DIGEST --accepted-media-types ${=MT} --query 'images[0].imageManifestMediaType' --output text)
aws ecr put-image --repository-name $REPO --image-tag $TAG --image-manifest "$MANIFEST" --image-manifest-media-type "$MTYPE"
aws ecr describe-images --repository-name $REPO --image-ids imageTag=$TAG --query 'imageDetails[0].imageDigest' --output text
```

Run once for the backend repo and once for the frontend repo. It reads the running image's manifest, adds the tag to that same image (nothing is copied or pushed), and prints the tag's digest, which **must equal the running digest**.

**0.5 Register the rollback task definitions.** Copies of today's backend and frontend task definitions with the image pinned to the tag, so a rollback can only start v4.

```bash
mkdir -p ~/ody-596/taskdefs
aws ecs describe-services --cluster $C --services $BE $FE --query "services[].taskDefinition" --output text
```

Prints the two task definitions running now (`family:revision`).

```bash
FAM=<family>; REV=<revision>; IMG=<image URI without :latest>
aws ecs describe-task-definition --task-definition $FAM:$REV --query taskDefinition > ~/ody-596/taskdefs/$FAM-$REV.json
jq --arg IMG "$IMG:$TAG" '.containerDefinitions[0].image = $IMG | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)' ~/ody-596/taskdefs/$FAM-$REV.json > ~/ody-596/taskdefs/$FAM-rollback.json
diff <(jq -S 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)' ~/ody-596/taskdefs/$FAM-$REV.json) <(jq -S . ~/ody-596/taskdefs/$FAM-rollback.json)
aws ecs register-task-definition --cli-input-json file://$HOME/ody-596/taskdefs/$FAM-rollback.json --query taskDefinition.taskDefinitionArn --output text
```

Run once per service. It saves the current definition, writes a copy with the tagged image, shows the difference (only the image line may change), and registers the copy as a new revision. Record the printed ARN. Registering starts nothing.

**0.6 The backend public URL answers.**

```bash
curl -s -o /dev/null -w "%{http_code}\n" $STRAPI_URL/_health
```

Must print `204`. Step 13 runs the API smoke against this URL. (The frontend itself reaches the backend on a private name that doesn't resolve outside AWS.)

**0.7 The merge PR.** Open it (dev: `feature/strapi-v5` → `develop`; prod: `develop` → `production`), check it contains only the v5 work and soak fixes, and get CI green and an approval. Record the head SHA.

**0.8 The maintenance page** (prod): see [Maintenance page](#maintenance-page). Rehearse it on dev's frontend listener first.

**0.9 E2E baseline** (dev only):

```bash
cd /Users/jaylenz/Documents/next/odyssey/frontend && npm run test:e2e -- --grep-invert "Reporting a bug|Submitting (Unique|Repeated) Request Access"
cp e2e/test-results.json ~/ody-596/e2e-baseline-$D.json && cd -
```

Runs the Playwright suite against dev, skipping the three tests that create real Linear issues and access requests, and keeps the results to compare with after the cutover. The saved logins expire, so run it within their lifetime.

**0.10 Window notes, roles and announcements.** Start the [window notes](#window-notes), name the Driver, Reviewer, Comms and Rollback approver, and (prod) have Comms announce the window and the Strapi admin edit freeze.

## Phase 1: Set up access (window day, before T0)

Both databases are private, so you reach them through a temporary jump instance and an SSM port-forward. Use three terminals: **A** for the tunnel, **B** for the work, **C** for the keepalive. Nothing here changes the environment. Start about 15 minutes before T0.

### Terminal A: the jump instance and the tunnel

```bash
export AWS_PROFILE=odyssey AWS_REGION=us-east-2
aws sso login
```

Points the AWS CLI at the Odyssey account and refreshes your SSO login.

```bash
AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 --query Parameter.Value --output text)
ID=$(aws ec2 run-instances --image-id $AMI --instance-type t4g.nano --subnet-id <subnet> <public IP flag> --security-group-ids <security groups> --iam-instance-profile Name=jumpbox-ssm --metadata-options HttpTokens=required --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ody-<env>-db-jump}]' --query 'Instances[0].InstanceId' --output text); echo $ID
```

Launches a tiny instance (about $0.25/day) in a subnet that can reach the database, with the `jumpbox-ssm` role. Use the subnet, security groups and public IP flag from the values table. Record the instance id.

```bash
aws ec2 wait instance-running --instance-ids $ID
aws ssm describe-instance-information --filters Key=InstanceIds,Values=$ID --query "InstanceInformationList[].PingStatus"
```

Waits for the instance, then asks SSM whether its agent is connected. Repeat the second line until it prints `"Online"` (1–3 minutes).

```bash
DBHOST=$(aws rds describe-db-instances --db-instance-identifier <DBI> --query "DBInstances[0].Endpoint.Address" --output text); echo $DBHOST
aws ssm start-session --target $ID --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["'"$DBHOST"'"],"portNumber":["5432"],"localPortNumber":["<PGPORT>"]}'
```

Looks up the database address (check it starts with the right instance name), then forwards your local port to it through the jump instance. Leave it running at `Waiting for connections...`. If it later says the session timed out, rerun just the second command.

### Terminal B: the work terminal

```bash
export AWS_PROFILE=odyssey AWS_REGION=us-east-2
ENV=<dev|prod>; C=<cluster>; BE=<backend service>; FE=<frontend service>; DBI=<db instance>; DB=<database>
SECRET=<backend secret>; FSECRET=<frontend secret>; STRAPI_URL=<backend URL>; LOGS=<backend log group>
export PGHOST=127.0.0.1 PGPORT=<PGPORT> PGUSER=postgres PGDATABASE=$DB
export PATH=/opt/homebrew/opt/postgresql@18/bin:$PATH
D=$(date -u +%F)
```

Sets every value later commands use (from the values table), points `psql` and `pg_dump` at the tunnel, puts the PostgreSQL 18 tools first (older ones can't dump a PG 18 server), and sets today's UTC date for file names. Variables only last in this terminal: paste the block again in any new one. Then check the date is today:

```bash
echo $D
```

Prints today's UTC date. File names and the snapshot id use it, so a stale value from yesterday's terminal gives misleading names.

```bash
aws secretsmanager get-secret-value --secret-id $SECRET --query SecretString --output text | python3 -c '
import json, sys, os
s = json.load(sys.stdin)
p = os.path.expanduser("~/.pgpass")
open(p, "a").write("127.0.0.1:%s:*:%s:%s\n" % (os.environ["PGPORT"], s["DATABASE_USERNAME"], s["DATABASE_PASSWORD"]))
os.chmod(p, 0o600)
print("saved login for", s["DATABASE_USERNAME"], "database", s["DATABASE_NAME"])'
```

Saves the database login to `~/.pgpass` without showing the password. The `*` in the database field matters: without it, `psql -d template1` asks for a password. Skip it if the line already exists. To check, list the saved lines without their passwords:

```bash
awk -F: '{print $1":"$2":"$3":"$4}' ~/.pgpass
```

Shows host, port, database and user for each saved login. You want `127.0.0.1:<PGPORT>:*:postgres`; if the database field is a name instead of `*`, fix that line rather than adding a new one.

```bash
BUCKET=$(aws secretsmanager get-secret-value --secret-id $SECRET --query SecretString --output text | python3 -c 'import json,sys; print(json.load(sys.stdin)["AWS_S3_BUCKET"])'); echo $BUCKET
cd /Users/jaylenz/Documents/next/odyssey && git fetch origin --quiet && git log -1 --format="checkout: %h %s"
```

Reads the media bucket name from the secret, and moves to the repo so the `scripts/...` paths work. Any branch that has `scripts/strapi-v5-cutover/` will do.

```bash
psql -c "select version(), current_user, current_database(), now() - pg_postmaster_start_time() as server_up_for;"
psql -d template1 -c "select 1 as template1_ok;"
aws ecs describe-services --cluster $C --services $BE $FE --query "services[].{name:serviceName,desired:desiredCount,running:runningCount,td:taskDefinition}" --output table
```

Proves the tunnel reaches the right database (version and name as in the values table; a long uptime means the real server, not a recently restored copy), that `template1` connects without a password, and that both services run their normal counts on the expected task definitions.

### Terminal C: keep the tunnel alive

```bash
export PGHOST=127.0.0.1 PGPORT=<PGPORT> PGUSER=postgres
while true; do /opt/homebrew/opt/postgresql@18/bin/psql -d template1 -qAt -c "select 1" >/dev/null && date +"%H:%M tunnel ok"; sleep 240; done
```

Session Manager closes a port-forward after about 20 minutes with no traffic, so this sends a tiny query every 4 minutes and prints `tunnel ok`. It uses `template1`, so it never counts as a session on `$DB` during step 7a or a swap. If the `tunnel ok` lines stop, restart the tunnel in Terminal A.

## Phase 2: Freeze and take safety copies (steps 1–3c)

Stop all changes, then capture independent ways back: an RDS snapshot (Path D), a dump file (Path C) and a fingerprint of the data. **The outage starts at step 3.**

**Step 1. Freeze on.** Make sure nobody is editing in the Strapi admin. Prod: turn the [maintenance page](#maintenance-page) on.

```bash
T0=$(date -u +"%Y-%m-%d %H:%M:%S UTC"); echo "T0: $T0"
```

Records the window start for the notes.

**Step 2. Snapshot.**

```bash
aws rds create-db-snapshot --db-instance-identifier $DBI --db-snapshot-identifier ody-v5-pre-$D --query "DBSnapshot.Status"
aws rds wait db-snapshot-available --db-snapshot-identifier ody-v5-pre-$D && date -u +"snapshot available %H:%M:%S"
```

Takes a full snapshot of the database server (the Path D way back) and waits until it's usable, a few minutes. Prints `"creating"`, then the time. The site is still up while it runs. Record the snapshot id.

**Step 3. Backend to 0 (outage starts).**

```bash
date -u +"step 3 %H:%M:%S"
aws ecs update-service --cluster $C --service $BE --desired-count 0 --query "service.desiredCount"
aws ecs wait services-stable --cluster $C --services $BE
```

Stops Strapi so nothing writes to the database. Prints `0`, then waits for ECS to reach it.

```bash
T=$(aws ecs list-tasks --cluster $C --service-name $BE --desired-status STOPPED --query "taskArns[0]" --output text)
aws ecs wait tasks-stopped --cluster $C --tasks $T && date -u +"old task stopped %H:%M:%S"
```

Waits for the old task to actually stop. **Don't skip it:** the service shows 0 running while the old task is still `DEACTIVATING` for the load balancer's deregistration delay (about 6 minutes on dev), and it keeps its database connections until then.

```bash
psql -d template1 -c "select count(*) as other_sessions from pg_stat_activity where datname='$DB' and pid <> pg_backend_pid();"
```

Counts other connections to the database. Must print `0`; anything else would block step 7a. If it isn't 0, see who they are:

```bash
psql -d template1 -c "select pid, client_addr, backend_start, state_change, left(query, 60) as last_query from pg_stat_activity where datname='$DB' and pid <> pg_backend_pid();"
```

Lists each connection's address, when it started and what it last ran. Your own tunnel sessions come from the jump instance's private IP; a connection from another address with a Strapi-style query is usually the old backend task still draining (wait for it), and anything else needs explaining before step 7a.

**Step 3a. T0 fingerprint.**

```bash
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-T0-$D.txt
grep -m1 -A2 flavor ~/ody-596/$ENV-fp-T0-$D.txt
```

Records row counts and the schema flavor at T0, so any copy can be compared with this moment. `flavor` must be `v4`.

**Step 3b. Dump.**

```bash
pg_dump -Fc -f ~/ody-596/$ENV-T0-$D.dump
pg_restore --list ~/ody-596/$ENV-T0-$D.dump > /dev/null && shasum -a 256 ~/ody-596/$ENV-T0-$D.dump
```

Writes a complete backup of the database to your laptop (the Path C way back), checks it can be read, and prints its sha256. Record the path and the sha256.

**Step 3c. Media listing.**

```bash
aws s3 ls s3://$BUCKET --recursive > ~/ody-596/$ENV-s3-T0-$D.txt; wc -l < ~/ody-596/$ENV-s3-T0-$D.txt
```

Lists every file in the media bucket, so a rollback can spot files deleted during v5. Prints the number of files.

## Phase 3: Prepare the data (steps 4–7b)

Handle every unpublished row while the data is still v4, prove none are left, then make the frozen copy a rollback swaps back to.

**Step 4. Audit.**

```bash
psql -v ON_ERROR_STOP=1 -f scripts/strapi-v5-cutover/unpublished-rows/01-audit.sql > ~/ody-596/$ENV-01-T0-$D.txt; echo "01 exit $?"
```

Lists unpublished rows, their dependents, exposure paths, publish permissions and orphan counts. Read-only. Must print `01 exit 0`. Query 4 is the baseline for step 12.

**Step 5. Compare with the rehearsal.**

```bash
diff <(sed -n '/== 1\./,/== 4\./p' <rehearsal 01 output>) <(sed -n '/== 1\./,/== 4\./p' ~/ody-596/$ENV-01-T0-$D.txt) && echo "unchanged since the rehearsal"
```

Compares sections 1–3 with the audit the `02` file was written from. If anything differs (a new unpublished row, a new dependent on a row marked for delete), **stop** and decide with the Reviewer, or abort.

**Step 6. Handle.**

```bash
psql -v ON_ERROR_STOP=1 -v expected_db=$DB -f <02 file>; echo "02 exit $?"
```

Runs `02` as one transaction. It refuses to run against the wrong database, rolls back everything on any error, and refuses to commit if any unpublished row is left. The output must match the rehearsal (dev: `UPDATE 7` … `DELETE 1` … `COMMIT`; prod: `UPDATE 2`, `UPDATE 0` four times, `DO`, `COMMIT`).

**Step 7. Gate.**

```bash
psql -v ON_ERROR_STOP=1 -f scripts/strapi-v5-cutover/unpublished-rows/01-audit.sql > ~/ody-596/$ENV-01-gate-$D.txt
sed -n '/== 1\./,/== 2\./p' ~/ody-596/$ENV-01-gate-$D.txt
```

Runs the audit again. **Every unpublished count must be 0;** if not, stop. These totals are the baseline for step 12.

**Step 7a. Frozen copy.**

```bash
psql -d template1 -v ON_ERROR_STOP=1 -v src=$DB -v frozen=${DB}_v4_frozen -f scripts/strapi-v5-cutover/rollback/clone-frozen.sql; echo "7a exit $?"
```

Copies the whole database to `<db>_v4_frozen`, the copy a rollback swaps back to (about 1 second). It runs from `template1` because Postgres can't copy a database you're connected to (and on dev `<db>` is itself called `postgres`). Prints `CREATE DATABASE` and both owners. If it warns that `datacl` or settings differ, re-apply them to the copy now.

**Step 7b. Copy check.**

```bash
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-gate-$D.txt
psql -d ${DB}_v4_frozen -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-copycheck-$D.txt
grep -h -m1 -A2 flavor ~/ody-596/$ENV-fp-gate-$D.txt ~/ody-596/$ENV-fp-copycheck-$D.txt
diff <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-gate-$D.txt) <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-copycheck-$D.txt) && echo "copy check clean"
```

Fingerprints the live database and the copy and compares their data (from section 4 on; line 4 is a timestamp and always differs). Both flavors must be `v4`, and it must print `copy check clean`. If not, investigate for up to 10 minutes, then abort ([Path A](strapi-v5-rollback.md#path-a-abort-the-database-is-untouched)).

## Phase 4: Deploy v5 (steps 8–11)

Merge the v5 code, let the pipeline build and deploy it, then start the backend so the one-way migration runs. **Up to step 10, aborting just means scaling the backend back up. After it, the database can only go back by restoring a copy.**

**Step 8. Merge.**

```bash
git fetch origin --quiet && git rev-parse <source branch> && git rev-list --count <source branch>..<target branch>
```

Prints the source branch's SHA (must be the recorded one) and how many target-branch commits the source lacks. On dev it must be `0`; otherwise stop, because those commits would join the merge untested. Then merge the PR on GitHub as a **merge commit** (not squash or rebase) and record the time:

```bash
date -u +"merged %H:%M:%S"
```

**Step 9. Wait for the pipeline.** Watch the run in GitHub → Actions until both "Update ECS service" steps finish (about 10–15 minutes). The frontend redeploys at once and shows errors until step 10; the backend stays at 0.

```bash
aws ecs describe-services --cluster $C --services $BE --query "services[0].{desired:desiredCount,primary:deployments[?status=='PRIMARY'].taskDefinition|[0]}"
```

`desired` must be `0`, and `primary` a task definition revision newer than the rollback one.

```bash
aws ecr describe-images --repository-name <backend repo> --image-ids imageTag=latest --query "imageDetails[0].{digest:imageDigest,pushed:imagePushedAt}" --output table
```

Confirms `:latest` is the new build: `pushed` after the merge, and a digest different from the v4 digest in the window notes.

**Step 10. Backend to 1 (starts the migration).** In a spare terminal (D), follow the logs first:

```bash
export AWS_PROFILE=odyssey AWS_REGION=us-east-2
aws logs tail <backend log group> --follow --since 1m --format short
```

Streams the backend's logs as they arrive. Then, in Terminal B:

```bash
date -u +"step 10 %H:%M:%S"
aws ecs update-service --cluster $C --service $BE --desired-count 1 --query "service.desiredCount"
```

Starts one v5 backend task. Its first boot runs the migration.

**Step 11. Wait for the migration.** In Terminal D, look for the `[internal migration]: migrating 5.0.0-…` lines, then **`[discard-drafts] Migration completed successfully`**, then **`Strapi started successfully`** (record its time). Allow a minute or two for ECS to pull and start the image before logs appear. **Roll back** if the logs show a crash or an error during the migration, the task keeps restarting, or there's still no `Strapi started successfully` long past the rehearsal's start-up time (dev: ~5 min after logs begin; prod: within the 600 s grace period).

```bash
aws elbv2 describe-target-health --target-group-arn $(aws ecs describe-services --cluster $C --services $BE --query "services[0].loadBalancers[0].targetGroupArn" --output text) --query "TargetHealthDescriptions[].TargetHealth.State" --output text
```

The load balancer's view of the new task. Must become `healthy` within about 2 minutes of the start.

## Phase 5: Verify (steps 12–14)

Prove nothing was lost in the migration, then that the API and the site work.

**Step 12. Verify the database.**

```bash
psql -v ON_ERROR_STOP=1 -f scripts/strapi-v5-cutover/unpublished-rows/03-post-switch-verify.sql > ~/ody-596/$ENV-03-$D.txt; echo "03 exit $?"
```

Compares the migrated data with the step 7 gate. Must exit 0, then check each section of the file:

- [ ] Section 1: `before_v5_boot` equals the step 7 totals.
- [ ] Section 2: no migrations missing.
- [ ] Section 3: every count is 0 (a duplicate `document_id` means Draft & Publish was on in the image).
- [ ] Section 4: equals step 4's query 4 output without the Super Admin rows.
- [ ] Section 5: orphan counts are unchanged from step 7.

```bash
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-after-v5-$D.txt
grep -m1 -A2 flavor ~/ody-596/$ENV-fp-after-v5-$D.txt
```

The after-v5 fingerprint. `flavor` must be `v5`.

**Step 13. API smoke.**

```bash
export ODY635_TOKEN=$(aws secretsmanager get-secret-value --secret-id $FSECRET --query SecretString --output text | python3 -c 'import json,sys; s=json.load(sys.stdin); print(s.get("STRAPI_ACCESS_TOKEN") or s["STRAPI_ACCESS_TOKEN_DEV2"])')
curl -s -o /dev/null -w "health %{http_code}\n" $STRAPI_URL/_health
```

Loads the frontend's own API token into the environment without showing it, and checks the backend answers. `health` must be `204`.

```bash
STRAPI_URL=$STRAPI_URL scripts/strapi-v5-cutover/api-smoke/smoke-queries.sh 2>&1 | tee ~/ody-596/$ENV-smoke-$D.txt | tail -15; echo "smoke exit ${pipestatus[1]}"
unset ODY635_TOKEN
```

Replays every query the frontend makes, read-only, then forgets the token. It must exit 0 with the baseline count (213 passed, 0 failed, 5 skipped). Don't set `ODY635_WRITES`. Exit 1 lists the failing checks with Strapi's error details, exit 2 is a token problem (401), exit 3 means it can't reach the backend.

**Step 14. Manual smoke check**, as staff and as a normal user (prod: through the maintenance bypass):

- [ ] explore
- [ ] a droplet and a lesson page
- [ ] a playlist
- [ ] a voyage
- [ ] a profile
- [ ] a group with due dates (including the Archived tab)
- [ ] the admin dashboard
- [ ] edit and save a droplet from the frontend (the ODY-700 path)
- [ ] the Strapi admin: no Publish button, saves go live, and `status` can be edited on droplets and voyages (ODY-699)
- [ ] media loads from the CDN

Dev only, E2E against the baseline:

```bash
cd /Users/jaylenz/Documents/next/odyssey/frontend && npm run test:e2e -- --grep-invert "Reporting a bug|Submitting (Unique|Repeated) Request Access"
diff <(jq -r '[.. | objects | select(has("specs"))] | .[].specs[] | select(.ok == false) | "\(.file)  \(.title)"' ~/ody-596/e2e-baseline-<date>.json | sort) <(jq -r '[.. | objects | select(has("specs"))] | .[].specs[] | select(.ok == false) | "\(.file)  \(.title)"' e2e/test-results.json | sort) && echo "no new E2E failures"; cd -
```

Reruns the suite and compares the failed tests with the baseline. Lines starting with `>` are tests that fail only on v5; investigate those. `no new E2E failures` is a pass.

The ODY-700 script (`smoke-regenerate-slug.sh`) renames real entries, so it runs only in rehearsals, never here. Step 14's droplet edit covers that path.

## Phase 6: Reopen and close out (step 15)

**Step 15. Go / no-go.** Go only when steps 12–14 all pass; ending before the scheduled end is fine. Reopening makes a rollback costlier (users' new work would be lost), so don't cut verification short. No-go: [roll back](#rollback).

```bash
T_OPEN=$(date -u +"%Y-%m-%d %H:%M:%S UTC"); echo "T_open: $T_OPEN"
```

Records the reopen time, which the rollback checklist needs.

- [ ] Prod: turn the [maintenance page](#maintenance-page) off.
- [ ] Freeze off; Comms announces the end of the window. Keep the Driver and the log watch going until the scheduled end.

```bash
aws ec2 terminate-instances --instance-ids $(aws ec2 describe-instances --filters Name=tag:Name,Values=ody-$ENV-db-jump Name=instance-state-name,Values=pending,running --query "Reservations[].Instances[].InstanceId" --output text)
```

After Ctrl+C in Terminals C and A: removes the jump instance, which closes the path into the database.

- [ ] Fill in the window notes. **Keep** the frozen copy, the snapshot, the dump, the rollback task definitions and the image tags through the soak period.

## Maintenance page

Prod only. Two temporary rules on the `odyssey-production` load balancer's HTTPS listener: your IP gets the real site (for step 14), everyone else gets a 503 page (`~/ody-596/maintenance-fixed-response.html`, at most 1,024 bytes, reloads itself every minute). They take effect instantly and need no deploy. The backend host (`data.khouryodyssey.org`, listener rule priority 100) is never matched, and load balancer health checks aren't affected.

### Switch on (step 1)

```bash
L=arn:aws:elasticloadbalancing:us-east-2:851725173181:listener/app/odyssey-production/248cb06a658903a6/d4d2598743aa4006
FTG=arn:aws:elasticloadbalancing:us-east-2:851725173181:targetgroup/odyssey-fe-production/fae24b8279e902ae
MYIP=$(curl -s https://checkip.amazonaws.com); echo $MYIP
```

Sets the listener and the frontend target group, and finds your public IP. Check it on the day: Wi-Fi or a VPN changes it.

```bash
python3 -c 'import json; b=open("/Users/jaylenz/ody-596/maintenance-fixed-response.html").read().strip(); assert len(b.encode())<=1024; json.dump([{"Type":"fixed-response","FixedResponseConfig":{"StatusCode":"503","ContentType":"text/html","MessageBody":b}}], open("/Users/jaylenz/ody-596/maintenance-action.json","w"))'
```

Turns the page into the load balancer's fixed-response format, and fails if it's over 1,024 bytes.

```bash
SITE='{"Field":"host-header","HostHeaderConfig":{"Values":["khouryodyssey.org","www.khouryodyssey.org"]}}'
BYPASS=$(aws elbv2 create-rule --listener-arn $L --priority 1 --conditions "[$SITE,{\"Field\":\"source-ip\",\"SourceIpConfig\":{\"Values\":[\"$MYIP/32\"]}}]" --actions Type=forward,TargetGroupArn=$FTG --query "Rules[0].RuleArn" --output text); echo "bypass: $BYPASS"
PAGE=$(aws elbv2 create-rule --listener-arn $L --priority 2 --conditions "[$SITE]" --actions file:///Users/jaylenz/ody-596/maintenance-action.json --query "Rules[0].RuleArn" --output text); echo "page: $PAGE"
```

Adds rule 1 (your IP on the site's host names → the real frontend) and rule 2 (the site's host names → the 503 page). Record both ARNs in the window notes.

```bash
curl -s -o /dev/null -w "site (you): %{http_code}\n" https://khouryodyssey.org
```

Must print `200` (you're bypassed). Then open khouryodyssey.org on your phone using mobile data: it must show the maintenance page.

### Switch off (step 15, or after a rollback once v4 is verified)

```bash
aws elbv2 delete-rule --rule-arn $PAGE
aws elbv2 delete-rule --rule-arn $BYPASS
aws elbv2 describe-rules --listener-arn $L --query "Rules[].Priority" --output text
```

Removes the page rule first (so you're never stuck behind it), then the bypass. The last line must no longer show `1` or `2`. Open maintenance pages reload themselves within a minute.

## Window notes

One file per environment, outside the repo (`~/ody-596/<env>-window-notes.md`), filled in as the window goes. The [rollback checklist](strapi-v5-rollback.md) reads every value from it.

- Environment, cluster, services and the frontend's normal task count; the backend target group and its health check
- `<db>`, its owner, and the copy names `<db>_v4_frozen`, `<db>_v5_failed`, `<db>_v4_restored`
- The merge SHA and PR, the `v4-pre-v5-<date>` tag with both digests, and both rollback task definition ARNs
- The rehearsal numbers and the rollback deadline
- The jump instance id; the maintenance page rule ARNs (prod)
- `T0`, the T0 snapshot id (step 2), the dump path and its sha256 (step 3b), the media listing (step 3c)
- The fingerprint files: T0 (3a), the copy check (7b) and after v5 (12)
- `T_open` (step 15), all times in UTC
- Who the Driver, Reviewer, Comms and Rollback approver are

## Rehearsal numbers

Fill these in before the window. Step 11 and the decision point use them.

- **Dev** (local rehearsal + the real dev cutover on 2026-10-26): `T_mig` ≈ 15 s (Strapi launched in 12.6 s on ECS); `T_rb` database part: Path B 77 s, Path C 3 min, Path D 10 min; API smoke 213/0/5; the window took 60 min with a 31 min outage.
- **Prod** (ODY-602 on a copy, 2026-10-26): migrations ~106 s and 171 s start-up through the tunnel (an upper bound; expect much less on ECS); `T_rb` database part 38 s; API smoke 213/0/5 with prod's frontend token. Plan a ~2 h window with a ~40–45 min outage.
- [ ] Window end: \_\_\_\_. **Rollback deadline** = window end − `T_rb` − 15 min (prod 2026-10-28: 11:30 ET = 15:30 UTC): \_\_\_\_

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

Follow the [rollback checklist](strapi-v5-rollback.md), with the values from the window notes. Keep the freeze (and, on prod, the maintenance page) on until it's done. Which path depends on how far the window got:

- **Before step 10** (v5 hasn't started): [Path A, abort](strapi-v5-rollback.md#path-a-abort-the-database-is-untouched). The database is still v4, and the changes from `02` can stay.
- **After step 10** (v5 has started): [Path B, swap back](strapi-v5-rollback.md#path-b-swap-back-to-the-frozen-copy) to the step 7a frozen copy. Use [Path C](strapi-v5-rollback.md#path-c-restore-from-the-dump) (the step 3b dump) if the frozen copy is missing or fails its check, and [Path D](strapi-v5-rollback.md#path-d-restore-the-snapshot-to-a-new-server) (the step 2 snapshot) only if the database server is unusable.

Every path ends by reverting the merge on the branch (`develop` or `production`), so the next push doesn't deploy v5 again.

## After the window

- Prod, once stable: lower the backend's health-check grace period to 120 s, and record it in ODY-797.

  ```bash
  aws ecs update-service --cluster $C --service $BE --health-check-grace-period-seconds 120 --query "service.healthCheckGracePeriodSeconds"
  ```

- Watch the backend and frontend logs for a day. Scanner noise (`Malicious Path`, 404s on `/wp-content/…`) and `Failed to find Server Action` from old browser tabs are normal. Look for `Invalid key`, `ValidationError`, 403s or 404s on real `/api` routes, and database errors.
- Drop the rollback points (frozen copy, snapshot, dump, rollback task definitions, image tags) only after the soak period, with approval.
