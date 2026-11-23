import type { ClientSafeProvider } from "next-auth/react";
import { authBaseUrl } from "./callback-url";
import { authOptions } from "./options";

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
