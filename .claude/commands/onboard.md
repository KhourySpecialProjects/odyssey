---
disable-model-invocation: true
---

# Onboard a New Contributor

First-time setup for a contributor who has just cloned this repo. Automate
everything that can be automated; collect a punch list of the few things only
the human can do (OAuth clicks, secrets from a teammate, database seeding,
Strapi API token generation).

This command is **idempotent** — running it again should detect what is
already set up, skip it, and only act on the remaining gaps.

The canonical human-readable reference for this process is
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) (workflow) and
[`README.md`](../../README.md) §3 and §5 (installation, including screenshots
of the Strapi admin panel). Point the contributor at those if they want the
long form.

## Opening message to the user

Before running anything, tell the contributor:

> I'll run through the Odyssey setup automatically, following the same steps
> laid out in `CONTRIBUTING.md` + `README.md`. A few things I cannot do for
> you — I'll collect them and present them as a checklist at the end:
>
> - OAuth for the Linear MCP server (browser prompt)
> - OAuth for the Figma MCP server (via `/mcp`)
> - Secret env values only a teammate can share (Azure AD / GitHub OAuth
>   client credentials, NextAuth secret, AWS keys, PostHog keys, Anthropic
>   API key, etc.)
> - **Generating a Strapi API token** — requires logging into the local
>   Strapi admin at `http://localhost:1337` and clicking through the UI.
>   I'll walk you through it at the end.
> - **Database seeding** — either getting the `data.sql` dump from a teammate
>   or setting up Authorized User roles from scratch via the Strapi admin.
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
command -v git && git --version
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

Four template files are checked in. For each pair, copy the `*.example` to
the runtime filename ONLY if the runtime file does not already exist. Do not
overwrite a contributor's existing env:

| Template (committed)           | Runtime (gitignored)   | Purpose                                      |
| ------------------------------ | ---------------------- | -------------------------------------------- |
| `frontend/.env.example`        | `frontend/.env.local`  | Next.js local dev (Azure AD, GitHub, Strapi) |
| `frontend/.docker.env.example` | `frontend/.docker.env` | Frontend in Docker (Strapi URL + token)      |
| `backend/.env.example`         | `backend/.env`         | Host-run Strapi (Postgres, JWT, S3, keys)    |
| `backend/.docker.env.example`  | `backend/.docker.env`  | Docker overrides (`DATABASE_HOST=strapiDB`)  |

```bash
[ ! -f frontend/.env.local ]  && cp frontend/.env.example        frontend/.env.local
[ ! -f frontend/.docker.env ] && cp frontend/.docker.env.example frontend/.docker.env
[ ! -f backend/.env ]         && cp backend/.env.example         backend/.env
[ ! -f backend/.docker.env ]  && cp backend/.docker.env.example  backend/.docker.env
```

Note: the `protect-files.sh` hook blocks `Edit`/`Write` on `.env*` files but
does not block `cp` via Bash. If any copy is blocked anyway, record MANUAL
for that file. **Never fill in values** — every key in the template must be
filled in by the contributor with secrets from a teammate.

For each copied file, list the empty keys in the MANUAL punch list so the
contributor knows exactly what to fill in and from whom.

**Backend `.env`** — the contributor chooses their own values for the
database block (`DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` —
e.g. `strapi`, `strapi_user`, any password). The rest (`APP_KEYS`,
`API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`,
all `AWS_S3_*` upload creds) must come from a teammate. Leave
`SLACK_WEBHOOK_URL` empty locally — it's prod-only.

**Backend `.docker.env`** — `DATABASE_HOST` MUST be `strapiDB` (the docker
service name). `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` should
match the `DATABASE_*` values from `backend/.env` so the Postgres container
initializes with the credentials Strapi will use to connect.

**Frontend `.env.local`** — needs Azure AD (`AZURE_AD_CLIENT_ID`,
`AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`), GitHub OAuth
(`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`), `NEXTAUTH_SECRET`, PostHog
(`POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`), Anthropic (`ANTHROPIC_API_KEY`), AWS S3
(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_*`,
`AWS_REGION`), and `STRAPI_ACCESS_TOKEN` (generated in Step 6 below). All
except `STRAPI_ACCESS_TOKEN` come from a teammate.

**Frontend `.docker.env`** — populated in Step 6 after the Strapi token is
generated. Final contents will be:

```bash
STRAPI_API_URL=http://host.docker.internal:1337
STRAPI_ACCESS_TOKEN=<token from step 6>
```

### 4. Docker — bring up local services

```bash
docker info > /dev/null 2>&1
```

- If that fails, Docker Desktop isn't running. Record MANUAL: "start Docker
  Desktop", then skip the rest of this step.
- If it succeeds, build and bring services up:

  ```bash
  docker compose build
  docker compose up -d
  ```

  Report which containers are running via `docker compose ps`. Wait for the
  `strapi` service to be healthy (it bootstraps the Postgres schema on first
  run — can take 30–60s).

Note: Strapi will not serve API traffic until the database is seeded AND
authorized user roles exist (Step 5). On a fresh volume,
`http://localhost:1337` will redirect to the Strapi admin registration page
— that's expected.

### 5. Database seeding — two paths

Present both options and ask the contributor which they want. Don't pick
for them.

#### Option A — Use production data (recommended)

1. MANUAL: "have a current team member sign you up through
   [dev2.data.khouryodyssey.org](http://dev2.data.khouryodyssey.org) so you
   can log into local Strapi with the same account later."
2. MANUAL: "request the `data.sql` SQL dump from a teammate. Drop it into
   the `initdb/` directory at the repo root. Docker will auto-run it on
   first container boot via the Postgres image's initdb hook."
3. If the `strapi-data` volume already exists, the initdb script won't
   re-run. Tell the contributor: "If you need to re-seed, delete the
   `odyssey_strapi-data` volume in Docker Desktop, then `docker compose up`
   again."
4. **You can't log in as the prod admins locally** (those users exist in
   the dump but not with their credentials). Offer to create a local admin
   for them. If they say yes, prompt for name/email/password and run:

   ```bash
   docker exec -i strapi npx strapi admin:create-user \
     --firstname="$F" --lastname="$L" \
     --email="$E" --password="$P"
   ```

#### Option B — Start from scratch

1. MANUAL: "go to `http://localhost:1337` and complete Strapi's admin
   registration flow. This is the admin account, not an Authorized User."
2. MANUAL: "in the Strapi admin, Content Manager → Authorized User Role →
   add the roles exactly as shown in `README.md` Section 4 screenshots. Any
   typo makes debugging painful later."
3. MANUAL: "add yourself as an Authorized User (your Northeastern email) and
   assign yourself the roles you need. For local dev, assigning all roles is
   fine."

### 6. Generate the Strapi API token

This cannot be scripted — the contributor has to click through the admin UI.
Record these steps as MANUAL (with the exact click path so they don't need
to open the README):

```
MANUAL: Generate the Strapi API token
  1. Open http://localhost:1337/admin in your browser.
  2. Log in as admin:
     - Prod-data path:   the local admin you created in Step 5.4.
     - Scratch path:     the admin you registered in Step 5.1.
  3. Bottom-left gear icon → Settings.
  4. Under "Global Settings" → API Tokens.
  5. Top-right "Create new API Token".
  6. Name: anything (e.g. "local-token").
     Token duration: Unlimited (or whatever your team convention is).
     Token type: Full access (for local dev).
  7. Save. The token string shows ONCE — copy it immediately.
  8. Paste it into BOTH:
     - frontend/.env.local:   STRAPI_ACCESS_TOKEN=<your_token>
     - frontend/.docker.env:  STRAPI_ACCESS_TOKEN=<your_token>
     (frontend/.docker.env also needs: STRAPI_API_URL=http://host.docker.internal:1337)
  9. Restart Docker so the frontend picks it up:
     docker compose down && docker compose up -d

  Screenshots of each step: see README.md §5 "API Key".
```

### 7. Verify project-scoped plugins (install any that are missing)

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

### 8. Verify project-scoped MCPs

`.mcp.json` registers `playwright` and `context7`. Confirm they show up:

```bash
claude mcp list 2>&1
```

If either is missing, note it in MANUAL — do not modify `.mcp.json`
(committed), the contributor should re-clone or investigate.

### 9. Install user-scoped MCPs (Linear + Figma)

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
- MANUAL: "authenticate Figma MCP — run `/mcp` → figma → Authenticate →
  Allow Access"

### 10. Verification — run quick CI

```bash
bash scripts/ci-local.sh quick
```

Report pass/fail. If it fails because env values aren't filled in yet, or
because the Strapi token isn't set, that's expected — note it as "will pass
once env values + Strapi token are filled in" rather than a hard failure.

## Output format

After all steps, print a summary like this, tailored to what actually
happened:

```
Odyssey Onboarding
══════════════════
✓ Tooling — git 2.45, node 20.11.1, npm 10.2.4, docker 24.0.7, jq 1.7, claude 1.x
⤳ Dependencies — node_modules already present (skipped)
✓ backend/.env           — created from template (values need filling)
✓ backend/.docker.env    — created from template (values need filling)
✓ frontend/.env.local    — created from template (values need filling)
✓ frontend/.docker.env   — created from template (token pending Step 6)
✓ Docker — 3 containers running (strapiDB, strapi, …)
✓ Plugins — typescript-lsp, code-simplifier, superpowers
✓ Project MCPs — playwright, context7
✓ User MCPs — linear added, figma added
○ CI (quick) — deferred until env + Strapi token are set

Manual steps remaining
──────────────────────
1. Fill env values (get from teammate):
   - backend/.env: APP_KEYS, API_TOKEN_SALT, ADMIN_JWT_SECRET,
     TRANSFER_TOKEN_SALT, JWT_SECRET, AWS_S3_* (or use docker defaults).
     Leave SLACK_WEBHOOK_URL empty locally — it's prod-only.
   - frontend/.env.local: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET,
     AZURE_AD_TENANT_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
     NEXTAUTH_SECRET, POSTHOG_API_KEY, POSTHOG_PROJECT_ID,
     NEXT_PUBLIC_POSTHOG_KEY, ANTHROPIC_API_KEY, AWS_* (all),
     APP_URL, DO_CDN_URL.

2. Seed the database — pick one:
   A) Prod data: get signed up at dev2.data.khouryodyssey.org, then request
      data.sql from a teammate, drop it in initdb/, then optionally create
      a local admin via `docker exec -i strapi npx strapi admin:create-user`.
   B) From scratch: register at localhost:1337, add Authorized User Roles
      via Strapi admin (see README.md §4 screenshots), add yourself as an
      Authorized User.

3. Generate the Strapi API token (click-through — no CLI equivalent):
   localhost:1337/admin → log in → Settings → API Tokens → Create new →
   Full access → Save → copy token → paste into both frontend/.env.local
   (STRAPI_ACCESS_TOKEN) AND frontend/.docker.env (STRAPI_ACCESS_TOKEN +
   STRAPI_API_URL=http://host.docker.internal:1337) →
   docker compose down && docker compose up -d

4. Authenticate Linear MCP — browser OAuth (or /mcp → linear → Authenticate)

5. Authenticate Figma MCP — /mcp → figma → Authenticate → Allow Access

Once the five items above are done, run `/ci quick` to verify, then
`npm run dev` to start the frontend + backend together.

Further reading:
  - CONTRIBUTING.md — the Claude Code workflow (/plan, /implement, /review, /ship)
  - README.md       — the long-form installation guide with screenshots
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
- Do NOT attempt to automate Strapi token generation — the admin UI requires
  a human click-through, and token strings are only shown once.
- Narrate briefly as you go — the contributor should be able to follow along
  without reading a wall of text.
