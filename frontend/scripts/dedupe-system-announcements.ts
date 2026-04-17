// frontend/scripts/dedupe-system-announcements.ts
//
// Cleans up duplicate system announcements left behind before the
// server-side dedupe fix (commit 94fb2331) landed.
//
// For each (authorized_user, content) group of system announcements,
// keeps the OLDEST one and deletes the rest.
//
// Dry-run by default. Pass --apply to actually delete.
//
// Usage (from frontend/):
//   npx tsx --env-file=.env.local scripts/dedupe-system-announcements.ts
//   npx tsx --env-file=.env.local scripts/dedupe-system-announcements.ts --apply
//
// To target prod, point STRAPI_URL + STRAPI_ACCESS_TOKEN at the prod
// Strapi instance in your .env.local before running.

import dotenv from "dotenv";
import fetch from "node-fetch";
import qs from "qs";

dotenv.config();

const STRAPI_URL =
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_API_URL ||
  "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");

if (!STRAPI_TOKEN) {
  console.error("Missing STRAPI_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

type Announcement = {
  id: number;
  attributes: {
    type: string;
    content: string;
    firstCreated: string;
    authorized_user?: {
      data?: { id: number } | null;
    };
  };
};

async function fetchAllSystemAnnouncements(): Promise<Announcement[]> {
  const all: Announcement[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const query = qs.stringify({
      filters: { type: { $eq: "system" } },
      populate: { authorized_user: { fields: ["id"] } },
      fields: ["type", "content", "firstCreated"],
      pagination: { page, pageSize },
      sort: ["firstCreated:asc"],
    });

    const res = await fetch(`${STRAPI_URL}/api/announcements?${query}`, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });
    if (!res.ok) {
      throw new Error(
        `Fetch announcements failed (page ${page}): ${res.status} ${await res.text()}`,
      );
    }
    const json = (await res.json()) as {
      data: Announcement[];
      meta: { pagination: { page: number; pageCount: number } };
    };

    all.push(...json.data);
    if (page >= json.meta.pagination.pageCount) break;
    page++;
  }

  return all;
}

async function deleteAnnouncement(id: number): Promise<void> {
  const res = await fetch(`${STRAPI_URL}/api/announcements/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Delete ${id} failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  console.log(`Target: ${STRAPI_URL}`);
  console.log(`Mode: ${APPLY ? "APPLY (will delete)" : "DRY RUN"}`);
  console.log();

  console.log("Fetching all system announcements…");
  const announcements = await fetchAllSystemAnnouncements();
  console.log(`Found ${announcements.length} total system announcements.`);

  // Group by (user id, content). Keep the oldest per group.
  const groups = new Map<string, Announcement[]>();
  for (const a of announcements) {
    const userId = a.attributes.authorized_user?.data?.id ?? 0;
    const key = `${userId}|${a.attributes.content}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const duplicates: Announcement[] = [];
  let groupsWithDupes = 0;
  for (const [, items] of groups) {
    if (items.length <= 1) continue;
    groupsWithDupes++;
    // Oldest first (we sorted asc). Keep items[0], delete the rest.
    duplicates.push(...items.slice(1));
  }

  console.log(
    `Groups with duplicates: ${groupsWithDupes} (${duplicates.length} extra records)`,
  );

  if (duplicates.length === 0) {
    console.log("Nothing to clean up. Done.");
    return;
  }

  // Look up user names for all affected user IDs
  const affectedUserIds = new Set<number>();
  for (const [, items] of groups) {
    if (items.length <= 1) continue;
    const uid = items[0].attributes.authorized_user?.data?.id;
    if (uid) affectedUserIds.add(uid);
  }

  const userNames = new Map<number, string>();
  for (const uid of affectedUserIds) {
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/authorized-users/${uid}?fields%5B0%5D=firstName&fields%5B1%5D=lastName&fields%5B2%5D=email`,
        { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } },
      );
      const json = (await res.json()) as {
        data?: {
          attributes?: {
            firstName?: string;
            lastName?: string;
            email?: string;
          };
        };
      };
      const a = json.data?.attributes;
      const label = a
        ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ||
          a.email ||
          `user ${uid}`
        : `user ${uid}`;
      userNames.set(uid, label);
    } catch {
      userNames.set(uid, `user ${uid}`);
    }
  }

  // Aggregate per-user counts
  console.log("\nBreakdown by user:");
  const perUser = new Map<number, { extras: number; lines: string[] }>();
  for (const [, items] of groups) {
    if (items.length <= 1) continue;
    const uid = items[0].attributes.authorized_user?.data?.id ?? 0;
    const content = items[0].attributes.content;
    const preview = content.slice(0, 60).replace(/\n/g, " ");
    const entry = perUser.get(uid) ?? { extras: 0, lines: [] };
    entry.extras += items.length - 1;
    entry.lines.push(`    "${preview}..." ×${items.length}`);
    perUser.set(uid, entry);
  }

  const sortedUsers = [...perUser.entries()].sort(
    (a, b) => b[1].extras - a[1].extras,
  );
  for (const [uid, info] of sortedUsers) {
    const name = userNames.get(uid) ?? `user ${uid}`;
    console.log(`  ${name} (id=${uid}) — ${info.extras} extra record(s)`);
    for (const line of info.lines) console.log(line);
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to delete.");
    return;
  }

  console.log(`\nDeleting ${duplicates.length} duplicates…`);
  let deleted = 0;
  let failed = 0;
  for (const a of duplicates) {
    try {
      await deleteAnnouncement(a.id);
      deleted++;
      if (deleted % 20 === 0) {
        console.log(`  deleted ${deleted}/${duplicates.length}`);
      }
    } catch (err) {
      failed++;
      console.error(`  failed to delete ${a.id}:`, err);
    }
  }

  console.log(`\nDone. Deleted ${deleted}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
