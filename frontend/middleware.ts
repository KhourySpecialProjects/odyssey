import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_MAX_AGE,
  MAINTENANCE_BYPASS_PARAM,
  MAINTENANCE_RETRY_AFTER,
  decideMaintenance,
  renderMaintenancePage,
} from "@/lib/maintenance";

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

/**
 * The routes the sign-in checks below apply to. The matcher used to list
 * exactly these; it now covers every route so maintenance mode can too.
 */
const AUTH_ROUTE =
  /^\/(?:|auth\/login|request-access|admin(?:\/.*)?|d(?:\/.*)?|activity(?:\/.*)?)$/;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE.test(pathname);
}

const authMiddleware = withAuth(
  function middleware(req) {
    const destination = SIGNED_IN_REDIRECTS.get(req.nextUrl.pathname);
    // `token.user` rather than `token`: the session callback in
    // lib/auth/options.ts rejects tokens without it, so that's the condition
    // under which the pages' own getServerSession() checks saw a session.
    if (!destination || !req.nextauth.token?.user) return;

    const url = req.nextUrl.clone();
    url.pathname = destination;
    url.search = "";
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

/** Answers the request itself while maintenance mode is on; undefined otherwise. */
function maintenanceResponse(req: NextRequest): NextResponse | undefined {
  const decision = decideMaintenance({
    pathname: req.nextUrl.pathname,
    method: req.method,
    userAgent: req.headers.get("user-agent"),
    bypassParam: req.nextUrl.searchParams.get(MAINTENANCE_BYPASS_PARAM),
    bypassCookie: req.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value,
  });

  const headers = {
    "Retry-After": MAINTENANCE_RETRY_AFTER,
    // So no browser or proxy keeps showing it after maintenance ends.
    "Cache-Control": "no-store",
  };
  const message = "Odyssey is down for maintenance. Please try again soon.";

  switch (decision.kind) {
    case "allow":
      return undefined;
    case "grant-bypass": {
      const url = req.nextUrl.clone();
      url.searchParams.delete(MAINTENANCE_BYPASS_PARAM);
      const res = NextResponse.redirect(url);
      res.cookies.set(
        MAINTENANCE_BYPASS_COOKIE,
        process.env.MAINTENANCE_BYPASS_TOKEN ?? "",
        {
          httpOnly: true,
          sameSite: "lax",
          secure: req.nextUrl.protocol === "https:",
          path: "/",
          maxAge: MAINTENANCE_BYPASS_MAX_AGE,
        },
      );
      return res;
    }
    case "api":
      return NextResponse.json({ error: message }, { status: 503, headers });
    case "write":
      return new NextResponse(message, {
        status: 503,
        headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      });
    case "page":
      return new NextResponse(renderMaintenancePage(), {
        status: 503,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
  }
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const maintenance = maintenanceResponse(req);
  if (maintenance) return maintenance;
  if (!isAuthRoute(req.nextUrl.pathname)) return;
  return authMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    // Every route except Next's build output and files served from public/
    // (anything with a file extension), so the maintenance page covers the
    // whole site while its logo and icon still load.
    "/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
