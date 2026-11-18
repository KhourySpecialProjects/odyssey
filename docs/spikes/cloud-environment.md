# Cloud environment spike (ODY-974)

Run date: 2026-11-18, cloud session on branch `claude/ody-974-cloud-spike` from `origin/develop` (8f6827ae).
Times are wall-clock seconds from `date +%s`. Total run time so far: about 17 minutes of the 30-minute box.

## Answers

1. **Subagents:** yes. Opus subagent started, reported `claude-opus-5-5`, returned, and says it has a fresh context. Sonnet subagent started, reported `claude-sonnet-5-5`, returned, fresh context. (Model names are self-reported; not checked against `get_session`.)
2. **Install:** yes. No `node_modules` existed in root, frontend or backend. `npm ci`: root 45 s, frontend 42 s, backend 377 s (about 7.7 min total).
3. **Strapi on SQLite:** yes. `npm run build` 34 s; healthy (`/_health` 204) 9 s after start. `/api/droplets` returns 403 Forbidden (expected without a token).
4. **Frontend:** yes. `npm run build` 125 s; `npm run start -- -p 3000` serves `/` 200 and `/explore` 200.
5. **Playwright and Docker:** Playwright yes, but only via the preinstalled browser at `/opt/pw-browsers/chromium` (`npx playwright install` was not run; see step 5). Docker: CLI present, daemon not running, so no. `psql` is present at `/usr/bin/psql`.
6. **Limits:** peak sampled RAM use 4.2 GB of 16 GB during the frontend build. Disk: 30 GB available before the install, 26 GB after the frontend build. npm registry reachable (HTTP 200). Playwright CDN (`playwright.azureedge.net`) returns 403 from the proxy.

## 1. Subagents

Commands (Agent tool, `subagent_type` general-purpose, prompt "Reply with only your exact model name and whether you can see any earlier conversation.", foreground):

- `model: opus`: started, returned in about 3.5 s. Report: "Opus 5.5 (claude-opus-5-5). No, I can't see any earlier conversation. All I have is this task message and the project instructions." Usage 39,002 tokens, 0 tool uses.
- `model: sonnet`: started, returned in about 3.4 s. Report: "Sonnet 5.5 (claude-sonnet-5-5). I can't see any earlier conversation. All I have is this task message, which includes the project instructions from CLAUDE.md." Usage 39,028 tokens.

Both agents were given the project instructions as context, which is why the reports mention CLAUDE.md. No error. The model could be chosen for both.

## 2. Install time

Pre-install state:

- `ls -d node_modules frontend/node_modules backend/node_modules`: none existed.
- `node -v` v22.23.5; `npm -v` 10.9.9; `nproc` 4.
- `free -m`: 16,087 MB total, 14,715 MB free, no swap.
- `df -h .`: `/dev/vda` 252G size, 9.1G used, 30G available.

Commands and times:

- `cd /home/user/odyssey && npm ci`: 1795033916 to 1795033961, **45 s**, exit 0. Ends with an npm audit warning.
- `cd frontend && npm ci`: 1795033965 to 1795034007, **42 s**, exit 0.
- `cd backend && npm ci`: 1795034007 to 1795034384, **377 s**, exit 0.

## 3. Strapi on SQLite

Env set with `export` (throwaway values): `DATABASE_CLIENT=sqlite`, `HOST=127.0.0.1`, `PORT=1337`, `APP_KEYS=a,b,c,d`, `API_TOKEN_SALT=x`, `ADMIN_JWT_SECRET=x`, `TRANSFER_TOKEN_SALT=x`, `JWT_SECRET=x`, `ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. `backend/.env` was not read or used.

- `npm run build` (in `backend/`): 1795034391 to 1795034425, **34 s**, exit 0 (compiles TS, builds admin panel).

First start attempt, a failure I caused:

- I also exported `NODE_ENV=production`. `config/env/production/database.ts` hardcodes `client: "postgres"`, so Strapi tried 127.0.0.1:5432.
- Last log lines: `error: connect ECONNREFUSED 127.0.0.1:5432` then `Shutting down Strapi`.
- Fix: remove `NODE_ENV`. The start without it used `config/database.ts` and the sqlite client.

Second start (no `NODE_ENV`):

- `npm run start` (background, log to scratchpad), started at 1795034751. Poll of `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health` got **204 at 1795034760 (9 s after start)**. "Strapi started successfully" in the log.
- `curl -s -w ' %{http_code}' http://127.0.0.1:1337/api/droplets | tail -c 300`: `{"data":null,"error":{"status":403,"name":"ForbiddenError","message":"Forbidden","details":{}}} 403`.
- Warnings in the log: `Encryption key is missing from admin.secrets.encryptionKey configuration` (twice), and a `sendmail` email provider notice (development only). No errors after boot.

## 4. Frontend

Env from `frontend/.env.example` and `process.env` reads: `STRAPI_API_URL` and `NEXT_PUBLIC_STRAPI_API_URL` = `http://127.0.0.1:1337`; `STRAPI_ACCESS_TOKEN=throwaway`; `NEXTAUTH_URL` and `APP_URL` = `http://127.0.0.1:3000`; `NEXTAUTH_SECRET` throwaway; dummy `AZURE_AD_*`, `GITHUB_*`, `ANTHROPIC_API_KEY`; `NEXT_PUBLIC_APP_ENV=local`. The PostHog and AWS vars were not set.

- `npm run build` (the script runs `next build --no-lint`): 1795034768 to 1795034893, **125 s**, exit 0. Route table printed.
- Memory: a sampler wrote `free -m` "used" every 10 s during the build. Peak used **4,166 MB**.
- `npm run start -- -p 3000`, started at 1795034896. `http://127.0.0.1:3000/` returned **200** within 4 s. `/explore` returned **200**.
- Log noise: `Fetch error: HTTP error! status: 401` from server-side Strapi calls, expected with the throwaway token.

## 5. Playwright and Docker

- `npx playwright install chromium`: **not run.** The environment note says the pre-installed Chromium at `/opt/pw-browsers` must not be reinstalled, since another version won't find it. The install and `--with-deps` steps were therefore skipped.
- Default launch, `node -e "require('playwright').chromium.launch()..."` in `frontend/` (Playwright 1.65.1): failed, `browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`. Time 1795034905, under 1 s.
- Pinned path: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })`, then `goto('http://127.0.0.1:3000/')`: **`status 200 title "Khoury Odyssey"`**, about 2 s (1795034910 to 1795034912).
- `docker info`: CLI at `/usr/bin/docker`, but `failed to connect to the docker API at unix:///var/run/docker.sock ... no such file or directory`. The daemon is not running.
- `which docker psql`: `/usr/bin/docker` and `/usr/bin/psql`.

## 6. Limits seen

- Run time so far: about 17 min of the 30-minute box (start 1795033895, last step about 1795034930).
- Peak sampled RAM used: 4,166 MB (frontend build). After the stack was stopped: 1,575 MB used, 14,511 MB available.
- Disk: 30 GB available before installs, 26 GB after the frontend build (`df -h .`).
- Network: `curl -sI https://registry.npmjs.org | head -1` returns `HTTP/2 200`. `curl -sI https://playwright.azureedge.net | head -1` returns `HTTP/1.1 403 Forbidden`.
- Coordination check (hook-triggered): `.claude/scripts/coord-status.sh ODY-974` reported `ODY-974: NO PRS`. Full Linear and Slack reads were not done because of the time box. Nothing was posted or changed.
- Logs went to the session scratchpad. One early install log went to `/tmp`; it is outside the repo and not committed.
- All started processes were stopped by PID: Strapi (npm 2034, sh 2049, node child), Next (npm 2566, sh 2581). Ports 1337 and 3000 no longer respond.

## What this means

(a) **A squad routine can run a reviewer subagent on Opus inside itself.** The Agent tool accepts `model: opus` and returns a result, and the subagent reports no earlier conversation (fresh context). The model name it reports is self-reported; the serving model was not checked.

(b) **A throwaway Strapi-on-SQLite + Next + Playwright stack runs here without Docker.** Strapi builds in 34 s and is healthy 9 s after start. Next builds in 125 s and serves `/` and `/explore` with 200. Playwright works through the preinstalled Chromium at the pinned path, not the default one. Docker is not available, and the stack doesn't need it. Roughly 3 minutes of build and start time when `node_modules` is warm, and about 10 to 11 minutes for a cold start that includes `npm ci` (about 7.7 min). Two traps found: `NODE_ENV=production` switches Strapi to a hardcoded Postgres config, and the default Playwright launch path is missing here.
