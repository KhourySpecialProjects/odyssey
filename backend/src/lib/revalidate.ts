/**
 * Revalidation notifier
 *
 * Strapi's Content Manager has no path back into the Next.js data cache — a
 * staff member editing data directly in the admin doesn't trigger the
 * frontend's `revalidateTag()` calls, so pages stay stale for up to the
 * global 900s TTL. This notifier closes that gap: it POSTs
 * `{ model, event, id }` to the frontend's `/api/revalidate` endpoint
 * whenever a watched model changes (see `backend/src/index.ts`), guarded by
 * a shared secret.
 *
 * Modeled on `./slack.ts`: env-gated no-op, 5s `AbortController` timeout,
 * `strapi.log.warn` on failure, swallows all errors, fire-and-forget (never
 * awaited by callers). The Strapi write must never fail or hang because the
 * frontend is unreachable — this degrades to today's 900s TTL, never worse.
 *
 * One deliberate difference from `slack.ts`: this does NOT early-return
 * when `NODE_ENV !== 'production'` — local dev needs revalidation to work
 * too.
 */
export function notifyRevalidate(
  model: string,
  event: string,
  id?: number | number[]
): void {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!frontendUrl || !secret) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(`${frontendUrl}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': secret,
    },
    body: JSON.stringify({ model, event, id }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        strapi.log.warn(
          `[revalidate] Frontend responded with ${res.status}: ${await res.text()}`
        );
      }
    })
    .catch((err) => {
      strapi.log.warn('[revalidate] Failed to notify frontend:', err);
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}
