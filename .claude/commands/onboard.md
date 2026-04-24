---
disable-model-invocation: true
---

# Onboard a New Contributor

First-time setup for a contributor who has just cloned this repo. Automate
everything that can be automated; collect a punch list of the few things only
the human can do (OAuth clicks, secrets from a teammate).

This command is **idempotent** — running it again should detect what is
already set up, skip it, and only act on the remaining gaps.

## Opening message to the user

Before running anything, tell the contributor:

> I'll run through the Odyssey setup automatically. A few things I cannot do
> for you — I'll collect them and present them as a checklist at the end:
>
> - OAuth for the Linear MCP server (browser prompt)
> - OAuth for the Figma MCP server (via `/mcp`)
> - Any secret env values only a teammate can share (e.g. `STRAPI_ACCESS_TOKEN`,
>   Azure AD / GitHub OAuth client credentials)
>
> Hit enter to continue, or tell me to stop.

Wait for acknowledgement before proceeding.

## Steps (run in order)

For each step below: capture stdout+stderr, report ✓ / ✗ / ⤳ skipped, and
record any manual follow-up in a running `MANUAL:` list to present at the end.
Do not stop on first failure — continue so the contributor gets the full
picture in one pass.

### 1. Preflight — verify required tooling

Check each of these is on PATH. If missing, record as MANUAL and keep going —
don't try to install system tooling:

```bash
command -v node && node --version
command -v npm && npm --version
command -v docker && docker --version
command -v jq && jq --version
command -v claude && claude --version
```

Minimum versions expected: Node 20+, npm 10+, Docker 24+. If Node is older,
record MANUAL: "upgrade Node to 20+".

### 2. Install dependencies

Idempotent: if `node_modules` exists at a given path, skip that install and
report ⤳. Otherwise run:

```bash
npm run setup
```

That script runs `npm install` at root, `frontend/`, and `backend/`. If it
fails partway, report which sub-install failed and stop this step (but
continue to later steps).

### 3. Create `.env` files from templates

Four template files are checked in. For each pair, copy the `*.example` to the
runtime filename ONLY if the runtime file does not already exist. Do not
overwrite a contributor's existing env:

| Template (committed)           | Runtime (gitignored)   |
| ------------------------------ | ---------------------- |
| `frontend/.env.example`        | `frontend/.env.local`  |
| `frontend/.docker.env.example` | `frontend/.docker.env` |
| `backend/.env.example`         | `backend/.env`         |
| `backend/.docker.env.example`  | `backend/.docker.env`  |

```bash
[ ! -f frontend/.env.local ]   && cp frontend/.env.example        frontend/.env.local
[ ! -f frontend/.docker.env ]  && cp frontend/.docker.env.example frontend/.docker.env
[ ! -f backend/.env ]          && cp backend/.env.example         backend/.env
[ ! -f backend/.docker.env ]   && cp backend/.docker.env.example  backend/.docker.env
```

Note: the `protect-files.sh` hook blocks `Edit`/`Write` on `.env*` files but
does not block `cp` via Bash. If a copy is blocked anyway, record MANUAL:
"copy the template manually". Do NOT fill in any values. Secrets come from a
teammate. List the empty keys across both `.env.local` and `backend/.env` in
the MANUAL punch list.

The `backend/.docker.env` and `frontend/.docker.env` files contain overrides
applied by docker-compose; see README §3 and §5 for what goes in them.

### 4. Docker — bring up local services

```bash
docker info > /dev/null 2>&1
```

- If that fails, Docker Desktop isn't running. Record MANUAL: "start Docker
  Desktop", then skip the rest of this step.
- If it succeeds:

  1. **Optional seed data.** If `initdb/data.sql` exists, postgres will seed it
     on first boot. If it doesn't, ask whether the contributor has a `data.sql`
     from a previous teammate. If yes, tell them to drop it in `initdb/` and
     run `/onboard` again. If no, proceed with an empty DB (they can register
     as a Strapi admin via the web UI on first boot).

  2. **Start the stack:**

     ```bash
     docker compose up -d
     ```

     Report which containers are running via `docker compose ps`.

  3. **If they used `data.sql`,** they can't log in as the prod admins (those
     users exist in the dump but not with their credentials). Offer to create
     a local admin for them. If they say yes, prompt for name/email/password
     and run:

     ```bash
     docker exec -i strapi npx strapi admin:create-user \
       --firstname="$F" --lastname="$L" \
       --email="$E" --password="$P"
     ```

  4. **Mint an API token** (manual, UI only). Record MANUAL:
     "log in at http://localhost:1337/admin → Settings → API Tokens → Create
     new API Token (Unlimited / Full access) → paste the token as
     `STRAPI_ACCESS_TOKEN` in `frontend/.docker.env`, then
     `docker compose up -d` again to pick it up."

### 5. Verify project-scoped plugins (install any that are missing)

These come with the repo (registered in `.claude/settings.json`). Check they
resolved:

```bash
claude plugin list 2>&1
```

Expected: `typescript-lsp`, `code-simplifier`, `superpowers`. For each
missing plugin, install it automatically — do not just record it as MANUAL:

```bash
claude plugin install <name>@claude-plugins-official --scope project 2>&1
```

Report each install's pass/fail. Only if an install itself fails (network,
marketplace not configured, etc.) should it get recorded as MANUAL.

### 6. Verify project-scoped MCPs

`.mcp.json` registers `playwright` and `context7`. Confirm they show up:

```bash
claude mcp list 2>&1
```

If either is missing, note it in MANUAL — do not modify `.mcp.json`
(committed), the contributor should re-clone or investigate.

### 7. Install user-scoped MCPs (Linear + Figma)

These are per-developer and not committed. Run the install commands; the
contributor completes OAuth in a browser afterwards.

```bash
claude mcp add --transport http linear https://mcp.linear.app/mcp 2>&1
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp 2>&1
```

If a server is already registered, the CLI will say so — treat that as ⤳
skipped, not a failure.

Always record these two MANUAL items (OAuth cannot be scripted):

- MANUAL: "authenticate Linear MCP — a browser window should have opened; if
  not, run `/mcp` → linear → Authenticate"
- MANUAL: "authenticate Figma MCP — run `/mcp` → figma → Authenticate → Allow Access"

### 8. Verification — run quick CI

```bash
bash scripts/ci-local.sh quick
```

Report pass/fail. If it fails because env values aren't filled in yet, that's
expected — note it as "will pass once env values are filled in" rather than a
hard failure.

## Output format

After all steps, print a summary like this, tailored to what actually
happened:

```
Odyssey Onboarding
══════════════════
✓ Tooling — node 20.11.1, npm 10.2.4, docker 24.0.7, jq 1.7, claude 1.x
⤳ Dependencies — node_modules already present (skipped)
✓ frontend/.env.local — created from template (18 values need filling)
✓ Docker — 3 containers running (postgres, strapi, …)
✓ Plugins — typescript-lsp, code-simplifier, superpowers
✓ Project MCPs — playwright, context7
✓ User MCPs — linear added, figma added
✓ CI (quick) — prettier, lint, tests all passed

Manual steps remaining
──────────────────────
1. Authenticate Linear MCP — browser OAuth
2. Authenticate Figma MCP — /mcp → figma → Authenticate
3. Fill in frontend/.env.local values (get from teammate):
   - AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
   - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
   - NEXTAUTH_SECRET
   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_* , AWS_REGION
   - POSTHOG_API_KEY, POSTHOG_PROJECT_ID, NEXT_PUBLIC_POSTHOG_KEY
   - ANTHROPIC_API_KEY
   - STRAPI_ACCESS_TOKEN (minted in the local Strapi UI, see item 5 below)
4. Fill in backend/.env values from a teammate (or from AWS Secrets Manager
   if you have access):
   APP_KEYS, API_TOKEN_SALT, ADMIN_JWT_SECRET, TRANSFER_TOKEN_SALT, JWT_SECRET,
   AWS_S3_* (upload creds), DATABASE_* (or use the docker defaults).
   Leave SLACK_WEBHOOK_URL empty locally. It's prod-only.
5. Mint a Strapi API token at http://localhost:1337/admin → Settings → API
   Tokens → Create new. Paste it as STRAPI_ACCESS_TOKEN in
   frontend/.docker.env, then `docker compose up -d` again.
6. (If you used data.sql) Create a local Strapi admin so you can log in.
   See step 4.3 above.

You're ready once the items above are done. Run `npm run dev` to start
the frontend + backend together, or `/ci` to re-verify.
```

If everything is already done (second run of `/onboard`), the Manual section
should be short or empty and the summary should read as a green confirmation.

## Rules

- Do NOT write or edit any `.env*` file's contents. Only copy the template
  wholesale; the contributor fills in values.
- Do NOT push, commit, or modify git state.
- Do NOT modify `terraform/`, `docker-compose.yml`, `.mcp.json`, or
  `.claude/settings.json`.
- Do NOT attempt to install system tooling (node, docker, jq). Record as
  MANUAL if missing.
- Narrate briefly as you go — the contributor should be able to follow along
  without reading a wall of text.
