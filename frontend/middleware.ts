import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { safeCallbackPath } from "@/lib/auth/callback-url";

/**
 * Public pages that signed-in users skip, mapped to where they land instead.
 * Redirecting here (from the JWT cookie alone) lets those pages render without
 * reading the session themselves.
 */
const SIGNED_IN_REDIRECTS = new Map<string, string>([
  ["/", "/activity"],
  ["/auth/login", "/explore"],
  ["/request-access", "/explore"],
]);

export default withAuth(
  function middleware(req) {
    const destination = SIGNED_IN_REDIRECTS.get(req.nextUrl.pathname);
    // `token.user` rather than `token`: the session callback in
    // lib/auth/options.ts rejects tokens without it, so that's the condition
    // under which the pages' own getServerSession() checks saw a session.
    if (!destination || !req.nextauth.token?.user) return;

    const url = req.nextUrl.clone();
    // A signed-in user on /auth/login has usually just come back from the
    // provider (signIn() without a callbackUrl returns to the current page),
    // so send them on to the page they were trying to reach (ODY-628).
    const callbackPath =
      req.nextUrl.pathname === "/auth/login"
        ? safeCallbackPath(req.nextUrl.searchParams.get("callbackUrl"))
        : undefined;
    if (callbackPath) {
      const target = new URL(callbackPath, url.origin);
      url.pathname = target.pathname;
      url.search = target.search;
    } else {
      url.pathname = destination;
      url.search = "";
    }
    return NextResponse.redirect(url);
  },
  {
    // Leave `pages.signIn` unset: withAuth skips the middleware function
    // entirely on that path, which would disable the /auth/login redirect.
    callbacks: {
      authorized({ req, token }) {
        // Anonymous visitors must still reach the public pages above.
        if (SIGNED_IN_REDIRECTS.has(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/",
    "/auth/login",
    "/request-access",
    "/admin",
    "/admin/:path*",
    "/d/:path*",
    "/activity",
    "/activity/:path*",
    // Group pages need a session; matching them sends signed-out visitors
    // to sign-in with a callbackUrl instead of rendering a blank page.
    "/g/:path*",
  ],
};
