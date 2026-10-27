# Strapi v5 Rollback Checklist

What to do when the Strapi v5 cutover goes wrong and we need to go back to Strapi v4. It applies to prod and dev; for dev, use the dev values and branch (`develop` instead of `production`). The reasoning is in [ODY-596](https://linear.app/aiil/issue/ODY-596), the cutover steps in [strapi-v5-cutover-window.md](strapi-v5-cutover-window.md), and the timeline and roles in the [migration-day playbook](strapi-prod-migration-day.md).

**How to use this page.** Decide whether to roll back, pick the path, then work through that path's phases. Each command has its own block with a note on what it does and what to expect: paste one block, check its output, then move on. Commands use the variables from the cutover window's [Phase 1](strapi-v5-cutover-window.md#phase-1-set-up-access-window-day-before-t0) plus the rollback values in [Set up](#set-up). Same zsh tips as the cutover: no `# comments` after pasted commands, never name a variable `HOST`.

| Path                                                                                    | When                                          | Database time rehearsed          |
| --------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------- |
| [A. Abort](#path-a-abort-the-database-is-untouched)                                     | v5 hasn't started yet (before window step 10) | none (the database is untouched) |
| [B. Swap back](#path-b-swap-back-to-the-frozen-copy)                                    | v5 has started (the normal case)              | dev 77 s, prod copy 38 s         |
| [C. Restore from the dump](#path-c-restore-from-the-dump)                               | Path B, but the frozen copy is missing or bad | dev ~3 min                       |
| [D. Restore the snapshot to a new server](#path-d-restore-the-snapshot-to-a-new-server) | the database server is unusable               | dev restore ~10 min              |

Every path then needs the ECS deploy of the v4 rollback task definitions (about 5–10 minutes including the old task's drain) and ends with [After every rollback](#after-every-rollback).

## Rules that always apply

1. **Never start the v4 backend on a database that v5 has run on.** v4 won't refuse to start. It silently erases every link between records: lessons in droplets, droplets in voyages, enrollments, group members. Always swap or restore the database first.
2. **The frontend and backend go back together.** The v5 frontend can't save anything to v4, and the v4 frontend can't save anything to v5.
3. **Never just scale the backend up.** Always deploy the rollback task definition. The pipeline only uses the `:latest` image, and `:latest` is now v5.
4. **Watch every v4 deploy until it's healthy.** If the v4 backend tasks keep failing to start, scale the backend to 0 immediately. ECS automatically rolls back failed deploys to the previous deployment, which is v5, and v5 would migrate the database you just put back.
5. No `terraform apply` until 24h after the site reopened (and not until ODY-797 is done). It resets the task counts and the health check.
6. Nobody runs the local Docker stack (`docker compose up`). It may be pointed at prod.
7. **Delete nothing without explicit approval.** That covers the failed database, the frozen copy, the snapshot and the dump.

## Set up

**You need access to the database.** During the window it's already set up (terminals A, B and C of the cutover's Phase 1). After the window has closed, set it up again from that phase: launch the jump instance, open the tunnel, set Terminal B's variables, start the keepalive.

**Then load the rollback values from the window notes** into Terminal B:

```bash
BE_RB=<backend rollback task definition ARN>; FE_RB=<frontend rollback task definition ARN>; FE_COUNT=<frontend normal count>
SNAP=<T0 snapshot id>; DUMP=<T0 dump path>; DUMP_SHA=<T0 dump sha256>; BUCKET=<media bucket>
T_OPEN='<T_open UTC, e.g. 2026-10-28 15:40:00+00>'
MERGE=<the v5 merge commit SHA on the target branch>
date -u +"rollback started %H:%M:%S"
```

Sets everything the paths below use, and records the start time. Leave `T_OPEN` empty if the site hasn't reopened. If any value is missing from the notes, find it before going further.

```bash
psql -d template1 -c "select 1 as template1_ok;"
aws ecs describe-services --cluster $C --services $BE $FE --query "services[].{name:serviceName,desired:desiredCount,running:runningCount,td:taskDefinition}" --output table
```

Confirms the tunnel works (no password prompt) and shows where both services are right now.

## 1. Decide whether to roll back

**Before the site reopens:** the Driver decides, using the cutover window's [decision point](strapi-v5-cutover-window.md#decision-point). Rolling back loses nothing. Roll back if any of these happen:

- [ ] v5's first start doesn't log `Strapi started successfully` within the expected start-up time (window step 11), or the backend crashes during the migration. Don't retry in the same window.
- [ ] After the migration, `03` shows lost rows or duplicate `document_id`s, or the after-v5 fingerprint (window step 12) shows count differences the rehearsal didn't.
- [ ] `03` has a failing section, the API smoke test has more failures than the rehearsal, or a manual smoke check item is broken and can't be fixed within 15 minutes.
- [ ] The rollback deadline passes and things still aren't green. Roll back no matter what.

**After the site reopens, for up to 24 hours:** the Rollback approver must sign off. Users' new work since reopening will be lost. Roll back if any of these happen:

- [ ] **Any sign of wrong or missing data**, such as missing lessons, broken voyages or missing enrollments. Always roll back for this.
- [ ] A role can't sign in for 30 minutes, with no fix in sight.
- [ ] Enrollments or progress fail to save for many users.
- [ ] Staff can't edit content or upload media, with no fix by end of business day.
- [ ] Backend 5xx errors stay above twice the normal level for 30 minutes.

If no data is damaged and a code fix can ship within about 2 hours, prefer fixing forward.

**More than 24 hours after reopening:** don't roll back. Fix forward only.

- [ ] **Write down** the time (UTC), what triggered the rollback, and who approved it.
- [ ] Prod: if the site has reopened, turn the [maintenance page](strapi-v5-cutover-window.md#maintenance-page) back on, so users stop writing to v5.

## 2. Pick the path

If you're not sure whether v5 has started:

```bash
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql | grep -m1 -A2 flavor
```

Shows which schema the live database has. `v4`: v5 hasn't touched it, use **Path A**. `v5` or `PARTIAL`: v5 has started, use **Path B** (or C or D, per the table at the top).

## Path A: Abort (the database is untouched)

The migration never ran, so only the app needs to go back. The `02` changes can stay: they're valid on v4.

```bash
aws ecs update-service --cluster $C --service $FE --task-definition $FE_RB --desired-count $FE_COUNT --query "service.taskDefinition"
```

Puts the frontend back on the v4 image, in case the pipeline already deployed the v5 frontend. Prints the rollback task definition.

```bash
aws ecs update-service --cluster $C --service $BE --task-definition $BE_RB --desired-count 1 --query "service.taskDefinition"
```

Starts the backend on the v4 rollback task definition (rule 3: never a plain scale-up).

```bash
aws ecs wait services-stable --cluster $C --services $BE $FE && date -u +"both stable %H:%M:%S"
```

Waits until both services run the rollback task definitions and pass their health checks (rule 4: if the backend keeps failing, scale it to 0 at once). Then run the [smoke test](#smoke-test) and go to [After every rollback](#after-every-rollback). The data is unchanged, so skip the re-entry and media steps.

## Path B: Swap back to the frozen copy

v5 has run on the live database, so put back the frozen copy from window step 7a, then bring v4 back. The swap itself takes seconds.

### B1. Stop everything (steps 1–2)

**Step 1.** Stop all writes. If the site has reopened, the frontend goes to 0 too.

```bash
aws ecs update-service --cluster $C --service $BE --desired-count 0 --query "service.desiredCount"
aws ecs update-service --cluster $C --service $FE --desired-count 0 --query "service.desiredCount"
aws ecs wait services-stable --cluster $C --services $BE $FE
```

Scales both services to 0 and waits. Skip the frontend line if the site hasn't reopened (the maintenance page or the outage is already keeping users out).

```bash
for S in $BE $FE; do for T in $(aws ecs list-tasks --cluster $C --service-name $S --desired-status STOPPED --query "taskArns[]" --output text); do aws ecs wait tasks-stopped --cluster $C --tasks $T; done; done; date -u +"old tasks stopped %H:%M:%S"
```

Waits until the stopping tasks are really gone. They linger for the load balancer's deregistration delay (about 6 minutes) and keep their database connections until then.

**Step 2.** Close leftover database connections.

```bash
psql -d template1 -c "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('$DB', '${DB}_v4_frozen') and pid <> pg_backend_pid();"
```

Ends any sessions still connected to the live database or the frozen copy, which would block the swap. It runs from `template1`: you can't rename a database you're connected to (and on dev `<db>` is itself called `postgres`). Usually prints `(0 rows)`.

### B2. Save what changed since reopening (step 3)

**Step 3.** Only if the site had reopened (`T_OPEN` is set):

```bash
psql -v ON_ERROR_STOP=1 -v t_open="$T_OPEN" -f scripts/strapi-v5-cutover/rollback/writes-since.sql > ~/ody-596/$ENV-writes-since-$D.txt; echo "writes-since exit $?"
grep -E '^[a-z_]+\|[0-9]+\|[0-9]+$' ~/ody-596/$ENV-writes-since-$D.txt | grep -vE '\|0\|0$'
```

Lists every table with rows created or updated since `T_open`, plus the rows themselves, for re-entry later. The second line shows only the tables that changed. Expect about 42 new `admin_permissions` rows even if nobody edited anything: v5 creates them on its first boot. They aren't user content.

### B3. Swap (steps 4–6)

**Step 4.** Check the frozen copy is good.

```bash
psql -d ${DB}_v4_frozen -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-frozen-recheck-$D.txt
grep -m1 -A2 flavor ~/ody-596/$ENV-fp-frozen-recheck-$D.txt
diff <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-copycheck-<window date>.txt) <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-frozen-recheck-$D.txt) && echo "frozen copy unchanged"
```

Fingerprints the frozen copy and compares it with the copy check from window step 7b, from section 4 on (line 4 is a timestamp). `flavor` must be `v4` and it must print `frozen copy unchanged`. If not, stop and go to **Path C**.

**Step 5.** Swap.

```bash
psql -d template1 -v ON_ERROR_STOP=1 -v live=$DB -v frozen=${DB}_v4_frozen -v failed=${DB}_v5_failed -f scripts/strapi-v5-cutover/rollback/swap-back.sql; echo "swap exit $?"
```

In one transaction, renames the broken database to `<db>_v5_failed` and the frozen copy to `<db>`, so the backend's settings point at the v4 data again. It refuses if anything is still connected. Prints both databases' owner, connect permissions (`datacl`) and settings, and must exit 0.

**Step 6.** Check the live database.

```bash
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql | grep -m1 -A2 flavor
```

`flavor` must be `v4`. Copies made with `TEMPLATE` don't keep connect permissions (`datacl`) or per-database settings: if step 5 showed a difference between the two rows, re-apply the `<db>_v5_failed` values to `<db>` before step 7.

```bash
date -u +"database restored %H:%M:%S"
```

Records when the database part of the rollback finished.

### B4. Bring v4 back (steps 7–8)

**Step 7.** Deploy both rollback task definitions.

```bash
aws ecs update-service --cluster $C --service $BE --task-definition $BE_RB --desired-count 1 --query "service.taskDefinition"
aws ecs update-service --cluster $C --service $FE --task-definition $FE_RB --desired-count $FE_COUNT --query "service.taskDefinition"
```

Starts the backend and the frontend on the v4 images tagged before the window (rules 2 and 3). Each prints its rollback task definition.

**Step 8.** Watch until both are healthy.

```bash
for i in $(seq 1 20); do date +%H:%M:%S; aws ecs describe-services --cluster $C --services $BE $FE --query "services[].{name:serviceName,running:runningCount,pending:pendingCount,primary:deployments[?status=='PRIMARY'].taskDefinition|[0],last:events[0].message}" --output table; sleep 30; done
```

Shows both services every 30 s for up to 10 minutes. Wait for `running` to reach the desired counts on the rollback task definitions. **If the backend keeps failing to start, scale it to 0 at once (rule 4)**, before ECS rolls the deploy back to v5:

```bash
aws ecs update-service --cluster $C --service $BE --desired-count 0 --query "service.desiredCount"
```

Then check the load balancer sees a healthy backend:

```bash
aws elbv2 describe-target-health --target-group-arn $(aws ecs describe-services --cluster $C --services $BE --query "services[0].loadBalancers[0].targetGroupArn" --output text) --query "TargetHealthDescriptions[].TargetHealth.State" --output text
```

Must print `healthy`.

### B5. Verify (step 9)

**Step 9.** Run the [smoke test](#smoke-test), then go to [After every rollback](#after-every-rollback).

## Path C: Restore from the dump

Use this when the frozen copy is missing or fails its check. It puts back the data from the very start of the window (window step 3b), before the `02` cleanup; that data is valid on v4.

**C1.** Do Path B steps 1–3 (stop everything, close connections, save writes since reopening).

**C2.** Check the dump is intact.

```bash
shasum -a 256 $DUMP
```

The printed sha256 must equal `$DUMP_SHA` from the window notes.

**C3.** Restore it into a new database.

```bash
createdb --maintenance-db=template1 -T template0 ${DB}_v4_restored
pg_restore --no-owner --role=<db owner> -j 4 -d ${DB}_v4_restored $DUMP; echo "restore exit $?"
```

Creates an empty database (from `template0`, because the keepalive may be connected to `template1` and Postgres won't copy a template that has other sessions), then loads the dump into it with four parallel workers. A `transaction_timeout` error is harmless if the dump was made by a newer `pg_dump` than the server.

**C4.** Check it.

```bash
psql -d ${DB}_v4_restored -f scripts/strapi-v5-cutover/rollback/fingerprint.sql > ~/ody-596/$ENV-fp-restored-$D.txt
grep -m1 -A2 flavor ~/ody-596/$ENV-fp-restored-$D.txt
diff <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-T0-<window date>.txt) <(sed -n '/== 4\./,$p' ~/ody-596/$ENV-fp-restored-$D.txt) && echo "restored matches T0"
```

`flavor` must be `v4`, and the data must match the T0 fingerprint from window step 3a.

**C5.** Swap it in.

```bash
psql -d template1 -v ON_ERROR_STOP=1 -v live=$DB -v frozen=${DB}_v4_restored -v failed=${DB}_v5_failed -f scripts/strapi-v5-cutover/rollback/swap-back.sql; echo "swap exit $?"
```

Same as Path B step 5, with the restored database in place of the frozen copy.

**C6.** Continue from Path B step 6.

## Path D: Restore the snapshot to a new server

Use this only when the database server itself can't be used. It's the slowest path: the restore alone took about 10 minutes on dev, plus repointing the backend and the v4 deploy.

**D1.** If the database can still be reached, do Path B steps 1–3. If it can't, scale the backend and frontend to 0 (Path B step 1) and skip the rest.

**D2.** Restore the T0 snapshot to a new instance with the same network and settings as the old one.

```bash
aws rds describe-db-instances --db-instance-identifier $DBI --query "DBInstances[0].{class:DBInstanceClass,subnetGrp:DBSubnetGroup.DBSubnetGroupName,paramGrp:DBParameterGroups[0].DBParameterGroupName,sg:join(' ',VpcSecurityGroups[].VpcSecurityGroupId)}" --output table
```

Shows the old instance's class, subnet group, parameter group and security groups (the window notes also have them).

```bash
date -u +"restore start %H:%M:%S"
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier ${DBI}-restored --db-snapshot-identifier $SNAP --db-instance-class <class> --db-subnet-group-name <subnet group> --db-parameter-group-name <parameter group> --vpc-security-group-ids <security groups> --no-publicly-accessible --query "DBInstance.DBInstanceStatus"
aws rds wait db-instance-available --db-instance-identifier ${DBI}-restored && date -u +"restore done %H:%M:%S"
```

Creates a new server from the T0 snapshot. Prints `"creating"`, then waits (10+ minutes; if the wait times out, run it again, the restore keeps going).

**D3.** Check it. Point the tunnel at the new server: in Terminal A, Ctrl+C the old session and start it again with the new address:

```bash
DBHOST=$(aws rds describe-db-instances --db-instance-identifier ${DBI}-restored --query "DBInstances[0].Endpoint.Address" --output text); echo $DBHOST
aws ssm start-session --target $ID --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["'"$DBHOST"'"],"portNumber":["5432"],"localPortNumber":["'"$PGPORT"'"]}'
```

Then in Terminal B:

```bash
psql -c "select now() - pg_postmaster_start_time() as up_for;"
psql -f scripts/strapi-v5-cutover/rollback/fingerprint.sql | grep -m1 -A2 flavor
```

`up_for` must be minutes (it's the new server), and `flavor` must be `v4`.

**D4.** Point the backend at the new server. The backend reads `DATABASE_HOST` from its secret; find which secret key feeds it, save the whole secret, and change only that key.

```bash
aws ecs describe-task-definition --task-definition $BE_RB --query "taskDefinition.containerDefinitions[0].secrets[?name=='DATABASE_HOST'].valueFrom" --output text
```

Prints the secret reference; the key name is between the last two `:` groups (for example `DATABASE_HOST`, or `DEV2_DATABASE_HOST` on dev).

```bash
KEY=<that key>
aws secretsmanager get-secret-value --secret-id $SECRET --query SecretString --output text > ~/ody-596/$ENV-secret-before-pathD.json && chmod 600 ~/ody-596/$ENV-secret-before-pathD.json
python3 -c 'import json,sys,os; p=os.path.expanduser("~/ody-596/'"$ENV"'-secret-before-pathD.json"); s=json.load(open(p)); print("old", sys.argv[1], "=", s[sys.argv[1]]); s[sys.argv[1]]=sys.argv[2]; q=p.replace("before","after"); json.dump(s, open(q,"w")); os.chmod(q,0o600)' "$KEY" "$DBHOST"
aws secretsmanager put-secret-value --secret-id $SECRET --secret-string file://$HOME/ody-596/$ENV-secret-after-pathD.json --query VersionId --output text
```

Saves the current secret (record the old host it prints in the window notes), writes a copy with only the host changed, and stores it as the secret's new version. New tasks read it when they start.

**D5.** Continue from Path B step 7 (the new tasks pick up the new host).

**D6.** Tell the team the infrastructure now differs from terraform (a new database server, a changed secret). Nobody runs `terraform apply` until that's sorted out; add it to ODY-797. Delete `~/ody-596/$ENV-secret-*-pathD.json` once the rollback is settled.

## Smoke test

First the API, then the site, as staff and as a normal user. Prod: use the maintenance bypass until it passes, then turn the maintenance page off.

```bash
curl -s -o /dev/null -w "health %{http_code}\n" $STRAPI_URL/_health
export TOKEN=$(aws secretsmanager get-secret-value --secret-id $FSECRET --query SecretString --output text | python3 -c 'import json,sys; s=json.load(sys.stdin); print(s.get("STRAPI_ACCESS_TOKEN") or s["STRAPI_ACCESS_TOKEN_DEV2"])')
curl -s -H "Authorization: Bearer $TOKEN" "$STRAPI_URL/api/droplets?pagination[pageSize]=1" | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"][0]; print("v4 response shape" if "attributes" in d else "NOT v4: no attributes")'
unset TOKEN
```

Checks the backend answers (`204`), then fetches one droplet with the frontend's token and checks the response has v4's nested `attributes` shape, which proves v4 is serving.

- [ ] Sign in, for each role
- [ ] Explore, plus a droplet page, a lesson page and a voyage page. Lessons show inside their droplets, and droplets inside their voyages.
- [ ] Enroll in something, and make progress on a lesson
- [ ] Edit a droplet in the app, and edit an entry in the Strapi admin
- [ ] Upload an image
- [ ] A group page with due dates, and the admin dashboard

```bash
date -u +"rollback verified %H:%M:%S"
```

Records when v4 was verified; from the decision to this is `T_rb`.

## After every rollback

- [ ] **Freeze the branch.** Nobody pushes to `production` (dev: `develop`) until the revert lands. The next push would run the v5 migration again, without this checklist.
- [ ] **Revert the v5 merge.** The pipeline rebuilds the v4 images from the revert, which is safe because the database is v4 again.

  ```bash
  git switch <production|develop> && git pull --ff-only
  git revert -m 1 $MERGE
  ```

  Creates a commit that undoes the merge (`-m 1` keeps the branch's side). Push it through the usual PR.

- [ ] **Prod: turn the maintenance page off** ([Switch off](strapi-v5-cutover-window.md#switch-off-step-15-or-after-a-rollback-once-v4-is-verified)), once the smoke test passes.
- [ ] **Announce it.** Comms says the site is back on the old version. If the site had reopened, also say that changes made between `<T_open>` and `<rollback time>` were lost.
- [ ] **Re-enter important work by hand**, using the writes-since report: staff content edits, new droplets and lessons, re-uploaded media, and group changes. Enrollments and progress are not re-entered; the announcement covers them.
- [ ] **Check media.**

  ```bash
  aws s3 ls s3://$BUCKET --recursive > ~/ody-596/$ENV-s3-after-rollback-$D.txt
  comm -23 <(awk '{print $4}' ~/ody-596/$ENV-s3-T0-<window date>.txt | sort) <(awk '{print $4}' ~/ody-596/$ENV-s3-after-rollback-$D.txt | sort)
  ```

  Lists the bucket now and prints files that existed at T0 but are gone. Files added during v5 are harmless and can stay. Missing files break pages: restore them from S3 versioning.

- [ ] **Check sign-in.** If signed-in users get errors, follow the session fix decided in ODY-596 Q4. _(Not decided yet.)_
- [ ] **Keep everything.** Keep `<db>_v5_failed`, the snapshot and the dump until the cause is understood. Dropping any of them needs explicit approval.
- [ ] **Close the access** when nothing else needs the database: Ctrl+C the keepalive and the tunnel, then terminate the jump instance (window step 15).
- [ ] **Write it up** in ODY-603: the timeline, the trigger, how long each step took, and what broke. File a ticket for the cause. Include no real user data.
- [ ] **Before trying again:** run the whole cutover from the start, with a new frozen copy. After the next migration, restart the frontend, because v5 gives every record a new `document_id` each time it migrates.
