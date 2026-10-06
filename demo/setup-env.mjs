// Creates backend/.env.demo and frontend/.env.demo (both git-ignored) with
// fresh demo-only secrets. Run once: npm run demo:setup
// It never overwrites an existing file. Never put production values in them.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const secret = (bytes = 16) => randomBytes(bytes).toString("base64");

const backend = `# Demo environment: backend settings (created by npm run demo:setup).
# Strapi reads this through ENV_PATH, so your normal backend/.env is not used.
# Never put production values in this file.

DEMO_MODE=true
HOST=0.0.0.0
PORT=1338
FRONTEND_URL=http://localhost:3001

# Postgres started by npm run demo:db:up
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5433
DATABASE_NAME=odyssey_demo
DATABASE_USERNAME=odyssey_demo
DATABASE_PASSWORD=odyssey_demo
DATABASE_SSL=false

# Demo-only Strapi secrets, generated for you
APP_KEYS=${secret()},${secret()}
API_TOKEN_SALT=${secret()}
ADMIN_JWT_SECRET=${secret()}
JWT_SECRET=${secret()}
TRANSFER_TOKEN_SALT=${secret()}

# Off in the demo: keep blank.
SLACK_WEBHOOK_URL=
AWS_CDN_URL=
AWS_CDN_ROOT_PATH=
AWS_S3_ACCESS_KEY=
AWS_S3_SECRET_KEY=
AWS_S3_REGION=
AWS_S3_ENDPOINT=
AWS_S3_BUCKET=
`;

const frontend = `# Demo environment: frontend settings (created by npm run demo:setup).
#
# Every key the app reads is listed here, even the blank ones, on purpose:
# Next.js also loads your .env.local, but it can't override a key that is
# already set here. Deleting a line would let a real secret from .env.local
# leak into the demo.
# Never put production values in this file.

DEMO_MODE=true
NEXT_PUBLIC_APP_ENV=demo

# App and auth
APP_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=${secret(32)}
# Real logins are off in the demo (the demo login comes in a later piece).
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ENABLE_DEV_ROLE_OVERRIDE=false

# Demo Strapi (npm run demo:backend)
STRAPI_API_URL=http://localhost:1338
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1338
# Paste the token printed by npm run demo:seed
STRAPI_ACCESS_TOKEN=

# Analytics: blank means off. For a separate demo PostHog project, put its
# keys here, never the production project's.
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
POSTHOG_API_KEY=
POSTHOG_PROJECT_ID=

# AI features (import, fun facts, slide auto-format): blank means off.
# Only ever a demo-only key with a monthly spend cap.
ANTHROPIC_API_KEY=

# Bug reports never reach Linear in the demo: keep blank.
LINEAR_API_KEY=
LINEAR_TEAM_ID=
LINEAR_BUG_LABEL_ID=

# Uploads stay in frontend/public/uploads while running next dev: keep blank.
AWS_CDN_URL=
AWS_S3_BUCKET_NAME=
AWS_S3_BUCKET_ROOT=
AWS_S3_BUCKET_URL=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Non-Python code blocks. Python runs in the browser and needs nothing.
# For other languages, start Piston (it's in docker-compose.yml) and set
# PISTON_API_URL=http://localhost:2000
PISTON_API_URL=
JUDGE0_URL=
JUDGE0_KEY=
JUDGE0_API_URL=
JUDGE0_API_KEY=
JUDGE0_LANGUAGE_IDS=
`;

for (const [file, contents] of [
  ["backend/.env.demo", backend],
  ["frontend/.env.demo", frontend],
]) {
  const target = path.join(root, file);
  if (existsSync(target)) {
    console.log(`${file} already exists, leaving it alone`);
  } else {
    writeFileSync(target, contents, { mode: 0o600 });
    console.log(`Created ${file}`);
  }
}
