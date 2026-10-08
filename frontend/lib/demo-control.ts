import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { isDemoMode } from "@/lib/auth/demo-login";

/**
 * The secret that guards the demo's control routes (/api/demo/*) and signs
 * its login links. Null outside demo mode or when it isn't set, and the
 * control routes then act as if they don't exist.
 */
export function demoControlSecret(): string | null {
  const secret = process.env.DEMO_CONTROL_SECRET;
  return isDemoMode() && secret ? secret : null;
}

/** Whether the request sends `Authorization: Bearer <secret>`. */
export function isDemoControlRequest(request: NextRequest, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
