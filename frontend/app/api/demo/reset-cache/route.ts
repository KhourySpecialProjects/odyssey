import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { demoControlSecret, isDemoControlRequest } from "@/lib/demo-control";

/**
 * Demo only. `npm run demo:reset` calls this after it restores the demo
 * database, so pages stop showing data Next cached before the reset.
 * Everything the app fetches is cached under the root layout, so
 * revalidating it clears all of it.
 */
export async function POST(request: NextRequest) {
  const secret = demoControlSecret();
  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isDemoControlRequest(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
