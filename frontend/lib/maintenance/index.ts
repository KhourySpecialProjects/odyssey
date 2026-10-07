// Maintenance mode: while MAINTENANCE_MODE=true, the middleware answers every
// request with a 503 instead of running the app. It reads the environment on
// each request, so turning it on or off only needs a restart, not a rebuild.
//
//   MAINTENANCE_MODE=true          turn it on
//   MAINTENANCE_UNTIL="3:00 PM ET" optional, shown on the page
//   MAINTENANCE_BYPASS_TOKEN=...   optional; open any URL with
//                                  ?maintenance_bypass=<token> to use the site
//                                  normally in that browser

export { renderMaintenancePage } from "./page";

export const MAINTENANCE_BYPASS_PARAM = "maintenance_bypass";
export const MAINTENANCE_BYPASS_COOKIE = "odyssey_maintenance_bypass";
export const MAINTENANCE_BYPASS_MAX_AGE = 12 * 60 * 60; // seconds
export const MAINTENANCE_RETRY_AFTER = "300"; // seconds

type Env = Record<string, string | undefined>;

export type MaintenanceRequest = {
  pathname: string;
  method: string;
  userAgent: string | null;
  bypassParam: string | null;
  bypassCookie: string | undefined;
};

export type MaintenanceDecision =
  /** Run the app as normal. */
  | { kind: "allow" }
  /** Valid bypass link: set the cookie and redirect to the URL without it. */
  | { kind: "grant-bypass" }
  /** A page load: show the maintenance page. */
  | { kind: "page" }
  /** An /api route: JSON 503. */
  | { kind: "api" }
  /** A form post or Server Action: plain 503, so nothing changes mid-update. */
  | { kind: "write" };

export function isMaintenanceMode(env: Env = process.env): boolean {
  return env.MAINTENANCE_MODE === "true";
}

/** Compares without returning early, so response timing doesn't leak the token. */
function tokensMatch(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function decideMaintenance(
  req: MaintenanceRequest,
  env: Env = process.env,
): MaintenanceDecision {
  if (!isMaintenanceMode(env)) return { kind: "allow" };

  // The ALB health check (GET / expecting a 200) has to keep passing.
  // Otherwise AWS marks every frontend task unhealthy and replaces them, and
  // students get the load balancer's error page instead of this one.
  if (req.userAgent?.startsWith("ELB-HealthChecker")) return { kind: "allow" };

  const token = env.MAINTENANCE_BYPASS_TOKEN;
  if (token) {
    if (req.bypassParam !== null && tokensMatch(req.bypassParam, token)) {
      return { kind: "grant-bypass" };
    }
    if (req.bypassCookie && tokensMatch(req.bypassCookie, token)) {
      return { kind: "allow" };
    }
  }

  if (req.pathname === "/api" || req.pathname.startsWith("/api/")) {
    return { kind: "api" };
  }
  if (req.method !== "GET" && req.method !== "HEAD") return { kind: "write" };
  return { kind: "page" };
}
