import type { ClientSafeProvider } from "next-auth/react";
import { authOptions } from "./options";

/**
 * next-auth's API base URL, resolved the way next-auth v4 does
 * (utils/parse-url.js): NEXTAUTH_URL, defaulting to
 * http://localhost:3000/api/auth, with a bare "/" path meaning "/api/auth".
 */
function authBaseUrl(nextAuthUrl = process.env.NEXTAUTH_URL): string {
  const fallback = new URL("http://localhost:3000/api/auth");
  const raw =
    nextAuthUrl && !nextAuthUrl.startsWith("http")
      ? `https://${nextAuthUrl}`
      : nextAuthUrl;
  const url = new URL(raw || fallback);
  const path = (
    url.pathname === "/" ? fallback.pathname : url.pathname
  ).replace(/\/$/, "");
  return `${url.origin}${path}`;
}

/**
 * Server-only. Returns the same map as next-auth's `getProviders()`, built
 * from `authOptions.providers` in-process instead of by fetching the app's own
 * /api/auth/providers route on every login page view.
 *
 * Mirrors next-auth v4 core/lib/providers.js (user options override the
 * provider's id and name; sign-in/callback URLs hang off the API base URL) and
 * core/routes/providers.js (exposes only id, name, type, signinUrl,
 * callbackUrl, keyed by id).
 */
export function getLoginProviders(): Record<string, ClientSafeProvider> {
  const baseUrl = authBaseUrl();
  const providers: Record<string, ClientSafeProvider> = {};

  for (const provider of authOptions.providers) {
    const id = provider.options?.id ?? provider.id;
    providers[id] = {
      id,
      name: provider.options?.name ?? provider.name,
      type: provider.type,
      signinUrl: `${baseUrl}/signin/${id}`,
      callbackUrl: `${baseUrl}/callback/${id}`,
    };
  }

  return providers;
}
