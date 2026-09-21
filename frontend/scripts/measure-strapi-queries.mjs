/**
 * Measures the cost of the queries behind the slow pages, and compares each
 * one against a trimmed version that fetches only the fields the UI actually
 * renders.
 *
 * This bypasses Next.js entirely — no data cache, no RSC — so it isolates
 * "how expensive is this Strapi query" from "how well is it cached".
 *
 * Usage:
 *   cd frontend && node scripts/measure-strapi-queries.mjs
 *   node scripts/measure-strapi-queries.mjs --runs 5
 *   node scripts/measure-strapi-queries.mjs --env .docker.env
 *
 * Needs NEXT_PUBLIC_STRAPI_API_URL and STRAPI_ACCESS_TOKEN. Takes them from
 * the process environment if they are already set (which is the case inside
 * the Docker containers), otherwise reads them from .env.local — or whatever
 * --env points at. Read-only: issues GETs only.
 */

import { readFileSync } from "node:fs";
import qs from "qs";

function parseArgs(argv) {
  const args = { runs: 3, env: ".env.local" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--runs") args.runs = Number(argv[++i]);
    if (argv[i] === "--env") args.env = argv[++i];
  }
  return args;
}

const REQUIRED = ["NEXT_PUBLIC_STRAPI_API_URL", "STRAPI_ACCESS_TOKEN"];

function parseEnvFile(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }

  const env = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/**
 * The process environment wins, so `docker compose exec` (which already has
 * both vars injected via env_file) works with no arguments at all.
 */
function loadEnv(file) {
  const fromProcess = {};
  for (const key of REQUIRED) {
    if (process.env[key]) fromProcess[key] = process.env[key];
  }

  if (REQUIRED.every((key) => fromProcess[key])) {
    console.log("Config: process environment");
    return fromProcess;
  }

  const fromFile = parseEnvFile(file);
  if (!fromFile) {
    throw new Error(
      `Need ${REQUIRED.join(" and ")}. They are not in the environment, and ` +
        `${file} could not be read. Set them directly or pass --env <path>.`,
    );
  }

  console.log(
    `Config: ${file}${Object.keys(fromProcess).length ? " + process environment" : ""}`,
  );
  return { ...fromFile, ...fromProcess };
}

/**
 * The populate blocks below are copied verbatim from the callsites so the
 * "current" numbers reflect production behaviour. Update them if the callsite
 * changes.
 */
const EXPLORE_DROPLETS_POPULATE = {
  lessons: {
    fields: ["*"],
    populate: {
      blocks: {
        on: {
          "droplets.generic": { populate: "*" },
          "droplets.expandable": { populate: "*" },
          "droplets.callout": { populate: "*" },
          "droplets.video": { populate: "*" },
          "droplets.quiz": {
            populate: { questions: { populate: { answerOptions: true } } },
          },
          "droplets.open-ended-quiz": { populate: { questions: true } },
        },
      },
    },
  },
  tags: { fields: ["*"] },
  authorized_users: { fields: ["id", "firstName", "lastName", "email"] },
  learningObjectives: { fields: ["objective"] },
  nextSteps: { fields: ["label", "url"] },
  prerequisites: { fields: ["name"] },
  postrequisites: { fields: ["name"] },
  usersFavorited: { fields: ["id"] },
};

/**
 * Exactly what the Explore grid reads, verified against the components:
 *   - lessons ids           → progress percentage (droplet-tile.tsx:104)
 *   - tags name/slug        → badges
 *   - usersFavorited ids    → initial heart state (sorted-droplets-grid.tsx:167)
 *   - authorized_users ids  → isCreator, gates the archive button (line 174)
 *
 * Deliberately excluded: lessons.blocks, learningObjectives, nextSteps,
 * prerequisites, postrequisites. Nothing in the grid reads them —
 * `exportDropletMarkdown` (droplet-tile.tsx:177) re-fetches the full droplet
 * on demand rather than using the page-level data.
 */
const TILE_ONLY_POPULATE = {
  lessons: { fields: ["id"] },
  tags: { fields: ["id", "name", "slug"] },
  usersFavorited: { fields: ["id"] },
  authorized_users: { fields: ["id"] },
};

const TILE_ONLY_FIELDS = [
  "id",
  "name",
  "slug",
  "description",
  "type",
  "focusArea",
  "difficulty",
  "averageRating",
  "status",
  "createdAt",
];

const PUBLISHED_FILTER = {
  $and: [{ status: { $eq: "published" } }, { isHidden: false }],
};

const CASES = [
  {
    group: "Explore · droplets",
    name: "current (all lesson blocks)",
    path: "/droplets",
    params: {
      filters: PUBLISHED_FILTER,
      populate: EXPLORE_DROPLETS_POPULATE,
      fields: ["*"],
      pagination: { pageSize: 100, page: 1 },
    },
  },
  {
    group: "Explore · droplets",
    name: "trimmed (tile fields only)",
    baseline: true,
    path: "/droplets",
    params: {
      filters: PUBLISHED_FILTER,
      populate: TILE_ONLY_POPULATE,
      fields: TILE_ONLY_FIELDS,
      pagination: { pageSize: 100, page: 1 },
    },
  },
  {
    group: "Explore · playlists",
    name: "current (droplets un-fielded)",
    path: "/playlists",
    params: {
      filters: { $and: [{ isPublic: true }], isArchived: { $eq: false } },
      populate: {
        droplets: { populate: { lessons: { fields: ["id", "name", "slug"] } } },
        authorized_users: { fields: ["id"] },
      },
      fields: ["id", "name", "slug", "isPublic"],
      pagination: { pageSize: 250, page: 1 },
    },
  },
  {
    group: "Explore · playlists",
    name: "trimmed (droplet ids + lesson count)",
    baseline: true,
    path: "/playlists",
    params: {
      filters: { $and: [{ isPublic: true }], isArchived: { $eq: false } },
      populate: {
        droplets: { fields: ["id"], populate: { lessons: { fields: ["id"] } } },
        authorized_users: { fields: ["id"] },
      },
      fields: ["id", "name", "slug", "isPublic"],
      pagination: { pageSize: 250, page: 1 },
    },
  },
  {
    group: "Tag dropdown (Activity + Create)",
    name: "current (getTags: all droplets per tag)",
    path: "/tags",
    params: {
      sort: ["name:asc"],
      fields: ["id", "name", "slug"],
      populate: { droplets: { fields: ["isHidden", "status"] } },
      pagination: { pageSize: 50, page: 1 },
    },
  },
  {
    group: "Tag dropdown (Activity + Create)",
    name: "trimmed (no droplet join)",
    baseline: true,
    path: "/tags",
    params: {
      sort: ["name:asc"],
      fields: ["id", "name", "slug"],
      pagination: { pageSize: 50, page: 1 },
    },
  },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function timeQuery({ baseUrl, token, path, params, runs }) {
  const query = qs.stringify(params, { encodeValuesOnly: true });
  const url = `${baseUrl}/api${path}?${query}`;
  const timings = [];
  let bytes = 0;
  let recordCount = 0;

  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.text();
    timings.push(performance.now() - start);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} for ${path}: ${body.slice(0, 300)}`,
      );
    }

    bytes = Buffer.byteLength(body, "utf8");
    if (i === 0) {
      try {
        const parsed = JSON.parse(body);
        recordCount = Array.isArray(parsed.data) ? parsed.data.length : 1;
      } catch {
        recordCount = 0;
      }
    }
  }

  timings.sort((a, b) => a - b);
  return {
    median: timings[Math.floor(timings.length / 2)],
    min: timings[0],
    max: timings[timings.length - 1],
    bytes,
    recordCount,
    queryLength: query.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv(args.env);
  const baseUrl = env.NEXT_PUBLIC_STRAPI_API_URL;
  const token = env.STRAPI_ACCESS_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      `${args.env} is missing NEXT_PUBLIC_STRAPI_API_URL or STRAPI_ACCESS_TOKEN.`,
    );
  }

  console.log(`Strapi: ${baseUrl}   runs per query: ${args.runs}\n`);

  const results = [];
  for (const testCase of CASES) {
    process.stdout.write(
      `  measuring ${testCase.group} — ${testCase.name} ... `,
    );
    try {
      const result = await timeQuery({
        baseUrl,
        token,
        runs: args.runs,
        ...testCase,
      });
      results.push({ ...testCase, ...result });
      console.log("ok");
    } catch (error) {
      console.log(`FAILED (${error.message})`);
    }
  }

  const groups = [...new Set(results.map((r) => r.group))];

  for (const group of groups) {
    const rows = results.filter((r) => r.group === group);
    console.log(`\n── ${group} ${"─".repeat(Math.max(0, 58 - group.length))}`);
    console.log(
      `   ${"variant".padEnd(38)}${"median".padStart(9)}${"payload".padStart(11)}${"records".padStart(9)}`,
    );

    for (const row of rows) {
      console.log(
        `   ${row.name.padEnd(38)}` +
          `${`${row.median.toFixed(0)}ms`.padStart(9)}` +
          `${formatBytes(row.bytes).padStart(11)}` +
          `${String(row.recordCount).padStart(9)}`,
      );
    }

    const current = rows.find((r) => !r.baseline);
    const trimmed = rows.find((r) => r.baseline);
    if (current && trimmed && trimmed.bytes > 0) {
      const sizeRatio = current.bytes / trimmed.bytes;
      const timeDelta = current.median - trimmed.median;
      console.log(
        `   → over-fetch: ${sizeRatio.toFixed(1)}× the payload, ` +
          `${timeDelta > 0 ? "+" : ""}${timeDelta.toFixed(0)}ms per request, ` +
          `${formatBytes(current.bytes - trimmed.bytes)} wasted`,
      );
    }
  }

  console.log(
    "\nNote: numbers scale with content volume. Run against an environment " +
      "whose data volume resembles production — a near-empty local DB will " +
      "understate the gap.",
  );
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
