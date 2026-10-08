import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import CredentialsProvider from "next-auth/providers/credentials";
import { authorizeDemoLogin, isDemoEmail } from "@/lib/auth/demo-login";
import { demoControlSecret } from "@/lib/demo-control";

/**
 * One-time login links for the demo, so agents and scripts can log in as a
 * persona without the persona picker (POST /api/demo/login-link, or
 * `npm run demo:login-link`). A link's token names the account, expires
 * after LOGIN_LINK_LIFETIME_MS, works once, and is signed with the demo
 * control secret.
 */
export const LOGIN_LINK_LIFETIME_MS = 10 * 60 * 1000;

type LinkClaims = { email: string; exp: number; jti: string };

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

/** A signed token that logs in `email` once, until it expires. */
export function createLoginLinkToken(
  email: string,
  secret: string,
  now = Date.now(),
) {
  const claims: LinkClaims = {
    email,
    exp: now + LOGIN_LINK_LIFETIME_MS,
    jti: randomUUID(),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    token: `${payload}.${sign(payload, secret)}`,
    expiresAt: claims.exp,
  };
}

// Ids of tokens already used, until they expire. Kept on globalThis because
// Next can load this module more than once in the same server process. It's
// in memory, so it assumes one frontend process, as the demo runs.
const globalForLinks = globalThis as typeof globalThis & {
  demoUsedLoginLinks?: Map<string, number>;
};
const usedTokens = (globalForLinks.demoUsedLoginLinks ??= new Map());

/**
 * The demo account a token logs in, or null if the token is forged,
 * expired, already used or not for a demo account. A good token is used up.
 */
export function redeemLoginLinkToken(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  let claims: Partial<LinkClaims>;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const { email, exp, jti } = claims;
  if (!isDemoEmail(email) || typeof exp !== "number" || exp <= now) return null;
  if (typeof jti !== "string") return null;

  for (const [id, expiry] of usedTokens) {
    if (expiry <= now) usedTokens.delete(id);
  }
  if (usedTokens.has(jti)) return null;
  usedTokens.set(jti, exp);
  return email;
}

/** A same-site path to land on after logging in; anything else is /explore. */
export function safeCallbackPath(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : "/explore";
}

/** next-auth `authorize` for login links: the link's demo account, or null. */
export async function authorizeDemoLink(
  credentials: Record<string, string> | undefined,
) {
  const secret = demoControlSecret();
  const token = credentials?.token;
  if (!secret || !token) return null;

  const email = redeemLoginLinkToken(token, secret);
  return email ? authorizeDemoLogin({ email }) : null;
}

export function demoLinkProvider() {
  return CredentialsProvider({
    id: "demo-link",
    name: "Demo login link",
    credentials: { token: { label: "Token", type: "text" } },
    authorize: authorizeDemoLink,
  });
}
