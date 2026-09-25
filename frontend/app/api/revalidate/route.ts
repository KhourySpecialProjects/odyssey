import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";
import { getTagsForModel } from "@/lib/revalidation-map";

// Strapi-admin data changes have no path back into the Next.js data cache —
// every request function tags its fetch and revalidates on Odyssey's own
// mutations, but a Content Manager edit doesn't. This endpoint is that path:
// the backend's global lifecycle subscriber (`backend/src/index.ts`) POSTs
// here on every watched-model write, guarded by a shared secret since
// `middleware.ts` intentionally doesn't cover `/api`.
//
// Fail-closed: no configured secret or a mismatched one both refuse to
// revalidate. The backend notifier (`backend/src/lib/revalidate.ts`) is the
// fail-open half of this pair — an unreachable/misconfigured frontend never
// blocks or fails the Strapi write.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return false;

  const provided = request.headers.get("x-revalidate-secret");
  if (!provided) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}

// The 503 branch below runs before any secret check, so it is reachable by
// anonymous callers — and `/api` is not covered by `middleware.ts`. Logging
// per request would let anyone flood the logs for free, so warn only on the
// first occurrence. Reset whenever the secret appears, so a later
// misconfiguration still gets reported once.
let warnedUnconfigured = false;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REVALIDATE_SECRET) {
      if (!warnedUnconfigured) {
        console.warn(
          "Revalidation not configured: REVALIDATE_SECRET is unset. " +
            "Strapi-admin edits will fall back to the 900s TTL. " +
            "This warning is logged once per process.",
        );
        warnedUnconfigured = true;
      }
      return NextResponse.json(
        { error: "Revalidation not configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    warnedUnconfigured = false;

    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { model, event } = (body ?? {}) as {
      model?: unknown;
      event?: unknown;
    };
    if (typeof model !== "string") {
      return NextResponse.json(
        { error: "Invalid model" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const tags = getTagsForModel(model, event);
    if (tags.length === 0) {
      return NextResponse.json(
        { revalidated: [] },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    for (const tag of tags) {
      revalidateTag(tag);
    }

    console.log(`Revalidated tags [${tags.join(", ")}] for model ${model}`);

    return NextResponse.json(
      { revalidated: tags },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error in revalidate API route:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
