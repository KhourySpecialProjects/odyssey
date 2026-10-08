import { NextRequest, NextResponse } from "next/server";
import { findEnabledDemoAccount, isDemoEmail } from "@/lib/auth/demo-login";
import {
  createLoginLinkToken,
  safeCallbackPath,
} from "@/lib/auth/demo-login-link";
import { demoControlSecret, isDemoControlRequest } from "@/lib/demo-control";

/**
 * Demo only. Creates a one-time login link for a demo account, for agents
 * and scripts that can't use the persona picker (`npm run demo:login-link`).
 *
 * POST { email, callbackUrl? } -> { url, expiresAt }
 */
export async function POST(request: NextRequest) {
  const secret = demoControlSecret();
  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isDemoControlRequest(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isDemoEmail(email)) {
    return NextResponse.json(
      { error: "email must be a demo account (@demo.odyssey.test)" },
      { status: 400 },
    );
  }
  if (!(await findEnabledDemoAccount(email))) {
    return NextResponse.json(
      { error: `No enabled demo account for ${email}` },
      { status: 404 },
    );
  }

  const { token, expiresAt } = createLoginLinkToken(email, secret);
  const url = new URL(
    "/auth/demo-link",
    process.env.NEXTAUTH_URL ?? request.nextUrl.origin,
  );
  url.searchParams.set("token", token);
  url.searchParams.set("callbackUrl", safeCallbackPath(body?.callbackUrl));
  return NextResponse.json({
    url: url.toString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });
}
