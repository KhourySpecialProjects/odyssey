import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/auth/demo-login";

const sameSecret = (given: string, expected: string) =>
  given.length === expected.length &&
  timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * Demo only. `npm run demo:reset` calls this after it restores the demo
 * database, so pages stop showing data Next cached before the reset.
 * Everything the app fetches is cached under the root layout, so
 * revalidating it clears all of it.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.DEMO_RESET_SECRET;
  if (!isDemoMode() || !secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const given = request.headers.get("authorization") ?? "";
  if (!sameSecret(given, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
