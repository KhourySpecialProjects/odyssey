#!/usr/bin/env node
// ODY-635: replays the captured frontend requests against Strapi. Needs ODY635_TOKEN.
// Reads are side-effect free; writes go to a non-existent documentId; DELETEs are skipped.
import { readFileSync } from "node:fs";

const BASE = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.ODY635_TOKEN;
const WRITES = process.env.ODY635_WRITES === "1";
const LOCK_USER_ID = process.env.ODY635_LOCK_USER_ID;
const MISSING_DOC_ID = "ody635nonexistent000000000";
const TIMEOUT_MS = 30000;

const catalogPath = process.argv[2];
if (!catalogPath) {
  console.error("usage: replay.mjs <catalog.json>");
  process.exit(64);
}
if (!TOKEN) {
  console.error("set ODY635_TOKEN");
  process.exit(64);
}

const counts = { pass: 0, fail: 0, skip: 0 };

function pass(label, note = "") {
  counts.pass++;
  console.log(`PASS  ${label}${note ? ` (${note})` : ""}`);
}

function fail(label, detail, error) {
  counts.fail++;
  console.log(`FAIL  ${label} (${detail})`);
  if (error?.message) console.log(`      message: ${error.message}`);
  if (error?.details && Object.keys(error.details).length) {
    console.log(`      details: ${JSON.stringify(error.details)}`);
  }
}

function skip(label, why) {
  counts.skip++;
  console.log(`SKIP  ${label} (${why})`);
}

function abort(message, code) {
  console.log(`ABORT ${message}`);
  console.log(
    `-- ${counts.pass} passed, ${counts.fail} failed, ${counts.skip} skipped before abort`,
  );
  process.exit(code);
}

// Sends one request. Returns { code, body }; a connection failure aborts the run.
async function send(method, pathAndQuery, json) {
  const url = `${BASE}/api${pathAndQuery}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Strapi-Response-Format": "v4",
      },
      ...(json !== undefined && { body: JSON.stringify(json) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (res.status === 401)
      abort(
        `401 from ${BASE} (bad ODY635_TOKEN, or a different API_TOKEN_SALT)`,
        2,
      );
    return { code: res.status, body };
  } catch (err) {
    const cause =
      err?.cause?.code || err?.cause?.message || err?.message || String(err);
    return abort(`cannot reach ${url.split("?")[0]}: ${cause}`, 3);
  }
}

const withQuery = (p, q) => (q ? `${p}?${q}` : p);

async function replayRead(entry) {
  const label = `${entry.fn} GET ${entry.path}`;
  const { code, body } = await send("GET", withQuery(entry.path, entry.query));
  const singleEntry = entry.path.split("/").filter(Boolean).length === 2;
  if (code === 200) return pass(label);
  if (code === 404 && singleEntry)
    return pass(label, "404 on sentinel id: query validated");
  return fail(label, `HTTP ${code}`, body?.error);
}

async function replayWrite(entry) {
  const label = `${entry.fn} ${entry.method} ${entry.path} -> PUT /${entry.collection}/<missing>`;
  const target = withQuery(
    `/${entry.collection}/${MISSING_DOC_ID}`,
    entry.query,
  );
  const { code, body } = await send("PUT", target, entry.body);
  const source = body?.error?.details?.source;
  if (code === 400 && (source === "body" || source === "query")) {
    return fail(label, `HTTP 400 ${source}`, body.error);
  }
  if (code === 404 || code === 400)
    return pass(label, `HTTP ${code}: validation passed`);
  if (code >= 200 && code < 300)
    return fail(
      label,
      `HTTP ${code}: unexpected success, a document may have been written`,
    );
  return fail(label, `HTTP ${code}`, body?.error);
}

async function lockRoundTrip() {
  const label = "lock round-trip";
  const found = await send(
    "GET",
    "/lessons?filters[lockedBy][id][$null]=true&fields[0]=id&pagination[pageSize]=1",
  );
  const lessonId = found.body?.data?.[0]?.id;
  if (found.code !== 200 || lessonId == null) {
    return fail(
      `${label} pick lesson`,
      `HTTP ${found.code}, no unlocked lesson`,
      found.body?.error,
    );
  }
  const base = `/lessons/${lessonId}`;
  const userId = Number(LOCK_USER_ID);
  let held = false;

  const release = async () => {
    if (!held) return;
    held = false;
    const r = await send("DELETE", `${base}/lock?userId=${userId}`);
    console.log(`-- lock release on lesson ${lessonId}: HTTP ${r.code}`);
  };
  const onSignal = async (sig) => {
    console.log(`-- ${sig}; releasing lock`);
    await release();
    process.exit(130);
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));

  try {
    const acquire = await send("POST", `${base}/lock`, { userId });
    held = acquire.code === 200;
    if (acquire.code === 200 && acquire.body?.locked === true)
      pass(`${label} acquire`);
    else
      fail(
        `${label} acquire`,
        `HTTP ${acquire.code}`,
        acquire.body?.error
          ? acquire.body.error
          : { message: JSON.stringify(acquire.body) },
      );

    const beat = await send("PUT", `${base}/lock/heartbeat`, { userId });
    if (beat.code === 200 && beat.body?.locked === true)
      pass(`${label} heartbeat`);
    else
      fail(`${label} heartbeat`, `HTTP ${beat.code}`, {
        message: JSON.stringify(beat.body),
      });

    const held1 = await send("GET", `${base}/lock-status`);
    if (held1.code === 200 && held1.body?.isLocked === true)
      pass(`${label} status is locked`);
    else
      fail(`${label} status is locked`, `HTTP ${held1.code}`, {
        message: JSON.stringify(held1.body),
      });

    const rel = await send("DELETE", `${base}/lock?userId=${userId}`);
    if (rel.code === 200) held = false;
    if (rel.code === 200 && rel.body?.locked === false)
      pass(`${label} release`);
    else
      fail(`${label} release`, `HTTP ${rel.code}`, {
        message: JSON.stringify(rel.body),
      });

    const after = await send("GET", `${base}/lock-status`);
    if (after.code === 200 && after.body?.isLocked === false)
      pass(`${label} status is unlocked (lockedBy null)`);
    else
      fail(`${label} status is unlocked`, `HTTP ${after.code}`, {
        message: JSON.stringify(after.body),
      });
  } finally {
    await release();
  }
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
console.log(`-- replaying ${catalog.length} catalog entries against ${BASE}`);

for (const entry of catalog) {
  if (entry.method === "GET") await replayRead(entry);
  else if (entry.method === "POST" || entry.method === "PUT")
    await replayWrite(entry);
  else
    skip(
      `${entry.fn} ${entry.method} ${entry.path}`,
      `${entry.method} is not replayed`,
    );
}

if (WRITES) {
  if (LOCK_USER_ID && Number(LOCK_USER_ID)) await lockRoundTrip();
  else
    skip("lock round-trip", "set ODY635_LOCK_USER_ID to an authorized-user id");
}

console.log(
  `-- ${counts.pass} passed, ${counts.fail} failed, ${counts.skip} skipped`,
);
if (counts.fail > 0) {
  console.log(`${counts.fail} FAILED`);
  process.exit(1);
}
console.log("ALL PASSED");
