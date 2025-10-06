// frontend/scripts/update-users.ts
// To run: npx tsx --env-file=.env.local scripts/update-users.ts
import dotenv from "dotenv";
import fetch from "node-fetch";
import qs from "qs";

dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

if (!STRAPI_TOKEN) {
  console.error("Missing STRAPI_ACCESS_TOKEN");
  process.exit(1);
}

async function fetchUsersWithoutTimeZone() {
  const query = qs.stringify({
    filters: { timeZone: { $null: true } },
    fields: ["id", "timeZone"],
  });
  const res = await fetch(`${STRAPI_URL}/api/authorized-users?${query}`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Fetch users failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<{
    data: Array<{ id: number; timeZone: string | null }>;
    meta: { pagination: { page: number; pageCount: number } };
  }>;
}

async function updateUserTimeZone(id: number, timeZone = "America/New_York  ") {
  const res = await fetch(`${STRAPI_URL}/api/authorized-users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify({ data: { timeZone } }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Update user ${id} failed: ${res.status} ${t}`);
  }
}

async function main() {
  let page = 1;
  let totalUpdated = 0;

  for (;;) {
    const { data, meta } = await fetchUsersWithoutTimeZone();
    if (!data?.length) break;

    for (const user of data) {
      await updateUserTimeZone(user.id);
      totalUpdated += 1;
    }

    if (page >= (meta?.pagination?.pageCount ?? page)) break;
    page += 1;
  }

  console.log(
    `Completed. Users updated: ${totalUpdated}`,
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});