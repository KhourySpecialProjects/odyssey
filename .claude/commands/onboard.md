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

- **frontend** — if `frontend/.env.local` does NOT exist and
  `frontend/.env.example` does, copy it:

  ```bash
  cp frontend/.env.example frontend/.env.local
  ```

  Note: the `protect-files.sh` hook blocks `Edit`/`Write` on `.env*` files but
  does not block `cp` via Bash. If the copy is blocked anyway, record MANUAL:
  "copy frontend/.env.example → frontend/.env.local manually". Do NOT fill in
  any values — every key in the template must be filled in by the contributor
  with secrets from a teammate. List the empty keys in the MANUAL punch list.

- **backend** — there is no `backend/.env.example` checked in. The backend
  reads env from a deploy-time secrets mount (`backend/set_env.sh`). For local
  dev, record MANUAL: "ask a teammate for `backend/.env` contents (DB URL,
  admin JWT secret, API token salt, app keys)".

### 4. Docker — bring up local services

```bash
docker info > /dev/null 2>&1
```

- If that fails, Docker Desktop isn't running. Record MANUAL: "start Docker
  Desktop", then skip the next sub-step.
- If it succeeds, bring services up in the background:

  ```bash
  docker compose up -d
  ```

  Report which containers are running via `docker compose ps`.

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
   - STRAPI_ACCESS_TOKEN
   - … (full list)
4. Get backend/.env contents from a teammate (no checked-in template)

You're ready once the four items above are done. Run `npm run dev` to start
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
