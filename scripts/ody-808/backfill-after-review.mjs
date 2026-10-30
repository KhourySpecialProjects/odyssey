#!/usr/bin/env node
// ODY-808: copies droplet.afterReview into a sent review (key <id>:0:1). Needs ODY808_TOKEN (droplet find, review find + create).
// STRAPI_URL defaults to http://localhost:1337; writes only with --apply, otherwise a dry run.
const BASE = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.ODY808_TOKEN;
const APPLY = process.argv.includes("--apply");
const TIMEOUT_MS = Number(process.env.ODY808_TIMEOUT_MS) || 30000;
const MAX_NOTE = 5000;

if (process.argv.slice(2).some((a) => a !== "--apply")) {
  console.error("usage: backfill-after-review.mjs [--apply]");
  process.exit(64);
}
if (!TOKEN) {
  console.error("set ODY808_TOKEN");
  process.exit(64);
}

class AbortRun extends Error {
  constructor(message, code) {
    super(message);
    this.exitCode = code;
  }
}

// Returns { code, body }; 401 or a connection failure throws AbortRun.
async function send(method, pathAndQuery, json) {
  const url = `${BASE}/api${pathAndQuery}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
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
      throw new AbortRun(`401 from ${BASE} (bad ODY808_TOKEN)`, 2);
    return { code: res.status, body };
  } catch (err) {
    if (err instanceof AbortRun) throw err;
    const cause =
      err?.cause?.code || err?.cause?.message || err?.message || String(err);
    throw new AbortRun(`cannot reach ${url.split("?")[0]}: ${cause}`, 3);
  }
}

// Pages through a collection (REST caps unpaginated reads at 25).
async function readAll(path, query) {
  const rows = [];
  for (let page = 1; ; page++) {
    const { code, body } = await send(
      "GET",
      `${path}?${query}&pagination[page]=${page}&pagination[pageSize]=100`,
    );
    if (code !== 200)
      throw new AbortRun(
        `GET ${path} gave ${code}: ${body?.error?.message ?? "no message"}`,
        1,
      );
    rows.push(...body.data);
    if (page >= (body.meta?.pagination?.pageCount ?? 1)) return rows;
  }
}

const keyOf = (id) => `${id}:0:1`;

async function keyExists(key) {
  const { code, body } = await send(
    "GET",
    `/reviews?filters[key][$eq]=${encodeURIComponent(key)}&fields[0]=key`,
  );
  return code === 200 && body.data.length > 0;
}

// Re-read just before a write: a reviewer may have opened a review mid-run.
async function hasReview(dropletId) {
  const { code, body } = await send(
    "GET",
    `/reviews?filters[droplet][id][$eq]=${dropletId}&fields[0]=key&pagination[pageSize]=1`,
  );
  return code === 200 && body.data.length > 0;
}

async function main() {
  const droplets = (
    await readAll(
      "/droplets",
      "filters[afterReview][$notNull]=true&fields[0]=name&fields[1]=status&fields[2]=afterReview&sort[0]=id:asc",
    )
  ).filter((d) => typeof d.afterReview === "string" && d.afterReview.trim());

  const reviews = await readAll(
    "/reviews",
    "fields[0]=key&populate[droplet][fields][0]=id&sort[0]=id:asc",
  );
  const withReview = new Set();
  const keys = new Set();
  for (const r of reviews) {
    keys.add(r.key);
    if (r.droplet) withReview.add(r.droplet.id);
  }

  const counts = { CREATE: 0, DONE: 0, SKIP: 0, FAIL: 0 };
  const log = (state, d, extra = "") =>
    console.log(
      `${state.padEnd(6)} #${d.id} "${d.name}" (${d.status}, ${d.afterReview.length} chars)${extra}`,
    );

  for (const d of droplets) {
    const warn = d.afterReview.length > MAX_NOTE ? "  WARN >5000 chars" : "";
    if (keys.has(keyOf(d.id))) {
      counts.DONE++;
      log("DONE", d, warn);
    } else if (withReview.has(d.id)) {
      counts.SKIP++;
      log("SKIP", d, `  has other reviews${warn}`);
    } else if (!APPLY) {
      counts.CREATE++;
      log("CREATE", d, warn);
    } else if (await hasReview(d.id)) {
      counts.SKIP++;
      log("SKIP", d, `  has other reviews${warn}`);
    } else {
      const { code, body } = await send("POST", "/reviews", {
        data: {
          droplet: d.documentId,
          round: 1,
          key: keyOf(d.id),
          state: "sent",
          summaryNote: d.afterReview,
        },
      });
      if (code >= 200 && code < 300) {
        counts.CREATE++;
        log("CREATE", d, `  created${warn}`);
      } else if (await keyExists(keyOf(d.id))) {
        counts.DONE++;
        log("DONE", d, `  (created meanwhile)${warn}`);
      } else {
        counts.FAIL++;
        log("FAIL", d, `  ${code} ${body?.error?.message ?? "no message"}`);
      }
    }
  }

  console.log(
    `\n${APPLY ? "APPLY" : "DRY RUN"}: CREATE ${counts.CREATE}, DONE ${counts.DONE}, SKIP ${counts.SKIP}, FAIL ${counts.FAIL}`,
  );
  return counts.FAIL > 0 ? 1 : 0;
}

// Exit codes are set (not process.exit) so piped stdout is flushed.
main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(err.message);
    process.exitCode = err.exitCode ?? 1;
  },
);
