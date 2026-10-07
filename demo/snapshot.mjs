// Saves and restores the demo's "golden" database, so a messed-up demo can go
// back to the freshly seeded world in seconds.
//
//   node demo/snapshot.mjs save      after seeding (npm run demo:seed does it)
//   node demo/snapshot.mjs restore   npm run demo:reset
//
// Restoring also shifts every date by the time since the snapshot was saved,
// so the world looks seeded today: "due in 3 days" stays due in 3 days.
// Then it tells the demo frontend to drop the data it cached before.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CONTAINER = "odyssey-demo-db"; // started by npm run demo:db:up
const DB = ["-U", "odyssey_demo", "-d", "odyssey_demo"];
const DIR = new URL("./.snapshot/", import.meta.url);
const DUMP = new URL("odyssey_demo.dump", DIR);
const INFO = new URL("snapshot.json", DIR);
const FRONTEND_ENV = new URL("../frontend/.env.demo", import.meta.url);
const FRONTEND_URL = process.env.DEMO_FRONTEND_URL ?? "http://localhost:3001";

const docker = (args, options = {}) =>
  execFileSync("docker", ["exec", "-i", CONTAINER, ...args], {
    maxBuffer: 1024 * 1024 * 1024,
    ...options,
  });

function save() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(DUMP, docker(["pg_dump", "--format=custom", ...DB]));
  writeFileSync(
    INFO,
    `${JSON.stringify({ savedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log("Saved the demo database. npm run demo:reset brings it back.");
}

// Shift every date and timestamp in the app's tables. Strapi's own tables
// (strapi_*, admin_*) are left alone. Date columns move by whole days.
const shiftDatesSql = (seconds) => `
DO $shift$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone')
      AND table_name NOT LIKE 'strapi\\_%' AND table_name NOT LIKE 'admin\\_%'
  LOOP
    IF c.data_type = 'date' THEN
      EXECUTE format('UPDATE %I SET %I = %I + %s', c.table_name, c.column_name, c.column_name, ${Math.round(seconds / 86400)});
    ELSE
      EXECUTE format('UPDATE %I SET %I = %I + interval ''%s seconds''', c.table_name, c.column_name, c.column_name, ${Math.round(seconds)});
    END IF;
  END LOOP;
END
$shift$;`;

/** The demo frontend's DEMO_RESET_SECRET, from the environment or frontend/.env.demo. */
function resetSecret() {
  if (process.env.DEMO_RESET_SECRET) return process.env.DEMO_RESET_SECRET;
  if (!existsSync(FRONTEND_ENV)) return null;
  const line = readFileSync(FRONTEND_ENV, "utf8").match(
    /^DEMO_RESET_SECRET=(.*)$/m,
  );
  return line?.[1].trim() || null;
}

async function clearFrontendCache() {
  const secret = resetSecret();
  const restart =
    "Restart npm run demo:frontend so it stops showing cached data.";
  if (!secret)
    return console.log(
      `No DEMO_RESET_SECRET in frontend/.env.demo. ${restart}`,
    );
  try {
    const response = await fetch(`${FRONTEND_URL}/api/demo/reset-cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    console.log("Cleared the demo frontend's cached data.");
  } catch {
    console.log(
      `The demo frontend isn't reachable at ${FRONTEND_URL}. If it's running, ${restart.toLowerCase()}`,
    );
  }
}

function restore() {
  if (!existsSync(DUMP)) {
    console.error(
      "No snapshot yet. Seed first: npm run demo:db:reset, then npm run demo:seed.",
    );
    process.exit(1);
  }
  const { savedAt } = JSON.parse(readFileSync(INFO, "utf8"));
  const seconds = (Date.now() - Date.parse(savedAt)) / 1000;
  docker(
    [
      "pg_restore",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--single-transaction",
      ...DB,
    ],
    {
      input: readFileSync(DUMP),
    },
  );
  docker(["psql", "-v", "ON_ERROR_STOP=1", "-q", ...DB], {
    input: shiftDatesSql(seconds),
  });
  console.log(
    `Restored the demo database and moved its dates ${(seconds / 86400).toFixed(1)} days forward.`,
  );
}

const command = process.argv[2];
if (command === "save") save();
else if (command === "restore") {
  restore();
  await clearFrontendCache();
} else {
  console.error("Usage: node demo/snapshot.mjs save|restore");
  process.exit(1);
}
