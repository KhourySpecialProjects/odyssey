import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import type {
  BadgeError,
  BadgeOption,
  BadgeOptionInput,
  BadgeResult,
  PickedBadge,
  PickedBadgeRecord,
  SavedBadgeOption,
} from "@/types/droplet-badge";

// Badge store requests (ODY-987). Deliberately not a "use server" file: every
// export of one is a public endpoint, and these trust the ids they are given.
// 989, 990, 991 and 992 call them from their own guarded server code, which
// checks the signed-in user and what they may do to the droplet first.
// Strapi only answers the service token on these routes. Logs hold status codes
// only: the emblem, title and URLs never go to the log.

const MAX_PICKED_LOOKUP = 100;
const REVALIDATE_SECONDS = 900;

const STATUS_ERRORS: Record<number, BadgeError> = {
  400: "invalid",
  404: "not_found",
  409: "conflict",
};

const isRowId = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n > 0 && n <= 2147483647;

const url = (path: string) =>
  `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/droplet-badges/${path}`;

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
  ...STRAPI_RESPONSE_FORMAT_HEADER,
});

async function send<T>(
  method: "GET" | "POST",
  path: string,
  init: Record<string, unknown>,
  body?: unknown,
): Promise<BadgeResult<T>> {
  try {
    const response = await fetch(url(path), {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...authHeaders(),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...init,
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      console.error(
        `${method} droplet-badges/${path.split("?")[0]} failed:`,
        response.status,
      );
      return { ok: false, error: STATUS_ERRORS[response.status] ?? "failed" };
    }
    return { ok: true, data: json.data as T };
  } catch {
    console.error(
      `${method} droplet-badges/${path.split("?")[0]} failed: network error`,
    );
    return { ok: false, error: "failed" };
  }
}

function flush(dropletId: number) {
  revalidateTag(CACHE_TAGS.dropletBadge(dropletId));
}

/** The picked badges of these droplets (1 to 100 ids); droplets with no badge are left out. */
export async function getPickedBadges(
  dropletIds: number[],
): Promise<BadgeResult<PickedBadge[]>> {
  const ids = [...new Set(dropletIds)];
  if (ids.length < 1 || ids.length > MAX_PICKED_LOOKUP || !ids.every(isRowId)) {
    return { ok: false, error: "invalid" };
  }
  return send<PickedBadge[]>("GET", `picked?dropletIds=${ids.join(",")}`, {
    next: {
      tags: [CACHE_TAGS.dropletBadges, ...ids.map(CACHE_TAGS.dropletBadge)],
      revalidate: REVALIDATE_SECONDS,
    },
  });
}

/** The options stored for the droplet; empty when none exist or a badge is picked. */
export async function getBadgeOptions(
  dropletId: number,
): Promise<BadgeResult<BadgeOption[]>> {
  if (!isRowId(dropletId)) return { ok: false, error: "invalid" };
  return send<BadgeOption[]>("GET", `options?dropletId=${dropletId}`, {
    next: {
      tags: [CACHE_TAGS.dropletBadges, CACHE_TAGS.dropletBadge(dropletId)],
      revalidate: REVALIDATE_SECONDS,
    },
  });
}

/** Replaces the droplet's stored options (1 to 3). Refused once a badge is picked. */
export async function saveBadgeOptions(input: {
  dropletId: number;
  userId: number;
  options: BadgeOptionInput[];
}): Promise<BadgeResult<SavedBadgeOption[]>> {
  const result = await send<SavedBadgeOption[]>(
    "POST",
    "options",
    { cache: "no-store" },
    input,
  );
  if (result.ok) flush(input.dropletId);
  return result;
}

/** Keeps one option as the droplet's badge and deletes the rest. */
export async function pickBadge(input: {
  dropletId: number;
  optionId: number;
  userId: number;
}): Promise<BadgeResult<PickedBadgeRecord>> {
  const result = await send<PickedBadgeRecord>(
    "POST",
    "pick",
    { cache: "no-store" },
    input,
  );
  if (result.ok) flush(input.dropletId);
  return result;
}
