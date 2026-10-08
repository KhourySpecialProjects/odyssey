// Calls the demo frontend's control routes (/api/demo/*) with the
// DEMO_CONTROL_SECRET from the environment or frontend/.env.demo. Used by
// demo:reset, demo:login-link and, later, the agent runner.
import { existsSync, readFileSync } from "node:fs";

const FRONTEND_ENV = new URL("../frontend/.env.demo", import.meta.url);
export const FRONTEND_URL =
  process.env.DEMO_FRONTEND_URL ?? "http://localhost:3001";

/** The demo control secret, or null if it isn't set anywhere. */
export function controlSecret() {
  if (process.env.DEMO_CONTROL_SECRET) return process.env.DEMO_CONTROL_SECRET;
  if (!existsSync(FRONTEND_ENV)) return null;
  const line = readFileSync(FRONTEND_ENV, "utf8").match(
    /^DEMO_CONTROL_SECRET=(.*)$/m,
  );
  return line?.[1].trim() || null;
}

/** POSTs to a control route and returns its JSON, or throws a readable error. */
export async function postControl(path, body = {}) {
  const secret = controlSecret();
  if (!secret) {
    throw new Error(
      "frontend/.env.demo has no DEMO_CONTROL_SECRET. Create the file with npm run demo:setup, or add DEMO_CONTROL_SECRET=<a long random string> to it and restart the demo frontend.",
    );
  }
  let response;
  try {
    response = await fetch(`${FRONTEND_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `The demo frontend isn't reachable at ${FRONTEND_URL}. Start it with npm run demo:frontend.`,
    );
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error ?? `${path} answered ${response.status}`);
  }
  return json;
}
