/**
 * Edge-safe (no authOptions import): middleware.ts uses this too.
 *
 * next-auth's API base URL, resolved the way next-auth v4 does
 * (utils/parse-url.js): NEXTAUTH_URL, defaulting to
 * http://localhost:3000/api/auth, with a bare "/" path meaning "/api/auth".
 */
export function authBaseUrl(nextAuthUrl = process.env.NEXTAUTH_URL): string {
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

/** The app origin next-auth builds absolute callback URLs from. */
export function authOrigin(): string {
  return new URL(authBaseUrl()).origin;
}

// Sending someone back to sign-in (or into next-auth's own routes) after
// signing in is never what they were trying to reach.
const REJECTED_PATHS = /^\/(auth\/login|api\/auth)(\/|$)/;

/**
 * Returns `value` as a same-origin path (pathname + search + hash), or
 * undefined when it isn't safe to redirect to after sign-in.
 *
 * Accepts a path starting with a single "/" and, because next-auth's
 * /api/auth/signin passes the login page an absolute callbackUrl, an absolute
 * URL on `origin`. Everything else (other origins, "//host", "/\host",
 * schemes like javascript:) is rejected to prevent open redirects.
 */
export function safeCallbackPath(
  value: unknown,
  origin: string = authOrigin(),
): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;

  const isPath = value.startsWith("/");
  if (isPath && /^\/[/\\]/.test(value)) return undefined;
  if (!isPath && !/^https?:\/\//i.test(value)) return undefined;

  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return undefined;
  }
  // Catches "/\t/host"-style tricks the URL parser normalises into a new host.
  if (url.origin !== origin) return undefined;
  // "/.//host" normalises to the path "//host", which is protocol-relative
  // again once it's used as a redirect target.
  if (url.pathname.startsWith("//")) return undefined;
  if (REJECTED_PATHS.test(url.pathname)) return undefined;

  return `${url.pathname}${url.search}${url.hash}`;
}
