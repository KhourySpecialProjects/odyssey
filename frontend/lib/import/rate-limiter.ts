import { AuthorizedUserRoleTitle } from "@/lib/globals";

export type AIAction = "split" | "expand" | "custom-prompt";

type RoleTier = "system-admin" | "faculty" | "creator-editor" | "user";

export const RATE_LIMITS: Record<AIAction, Record<RoleTier, number>> = {
  split: {
    "system-admin": 1000,
    faculty: 20,
    "creator-editor": 15,
    user: 5,
  },
  expand: {
    "system-admin": 1000,
    faculty: 50,
    "creator-editor": 30,
    user: 10,
  },
  "custom-prompt": {
    "system-admin": 1000,
    faculty: 50,
    "creator-editor": 30,
    user: 10,
  },
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms

/** Keyed by `${email}:${action}` → timestamps of calls within the window */
const usageStore = new Map<string, number[]>();

function getRoleTier(roles: AuthorizedUserRoleTitle[]): RoleTier {
  if (roles.includes(AuthorizedUserRoleTitle.SysAdmin)) return "system-admin";
  if (roles.includes(AuthorizedUserRoleTitle.Faculty)) return "faculty";
  if (
    roles.includes(AuthorizedUserRoleTitle.ContentCreator) ||
    roles.includes(AuthorizedUserRoleTitle.ContentEditor)
  ) {
    return "creator-editor";
  }
  return "user";
}

/**
 * Sliding-window rate limiter.
 * Prunes entries older than 1 hour on every call.
 * Returns { allowed: true } when under limit, or { allowed: false, retryAfterMs } when over.
 */
export function checkRateLimit(
  email: string,
  roles: AuthorizedUserRoleTitle[],
  action: AIAction,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const key = `${email}:${action}`;

  // Retrieve and prune stale entries
  const timestamps = (usageStore.get(key) ?? []).filter(
    (ts) => now - ts < WINDOW_MS,
  );

  const tier = getRoleTier(roles);
  const limit = RATE_LIMITS[action][tier];

  if (timestamps.length >= limit) {
    const oldestTs = timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldestTs);
    usageStore.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  usageStore.set(key, timestamps);

  // Clean up empty entries to prevent unbounded memory growth
  if (timestamps.length === 0) {
    usageStore.delete(key);
  }

  return { allowed: true };
}

/** Format a rate limit rejection into a user-facing error message. */
export function formatRateLimitError(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  return `Rate limit reached. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
}
