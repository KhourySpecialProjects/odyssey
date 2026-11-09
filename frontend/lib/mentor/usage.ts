import "server-only";
import type { AuthUser } from "@/lib/auth/guards";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

// Mentor's allowance check and usage record (ODY-884). The limits live in
// Strapi (`backend/src/lib/mentor-usage.ts`); this wraps its routes and adds
// the in-memory burst guard. Deliberately not a "use server" file: every
// export of one is a public endpoint, and these trust the `user` they are given.

export const MENTOR_KINDS = ["lesson", "explain", "quiz-hint"] as const;
export type MentorKind = (typeof MENTOR_KINDS)[number];

/** Models Mentor may call. Each one has a price in ai-scoring-setting (test-enforced). */
export const MENTOR_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"] as const;
export type MentorModel = (typeof MENTOR_MODELS)[number];

/** The signed-in user, as `requireRole` / `withAuth` return it. */
export type MentorUser = Pick<AuthUser, "id" | "email" | "roles">;

export type MentorRefusalReason =
  | "disabled" // mentor-setting.enabled is off                 → 503
  | "not_in_pilot" // pilotGroups set and the user is in none     → 503
  | "monthly_cap" // this month's Mentor spend >= monthlyCapUsd   → 503
  | "daily_limit" // the user's rows today >= perUserDailyLimit   → 429
  | "rate_limited" // in-memory burst guard (per ECS task)        → 429
  | "unavailable"; // Strapi unreachable / 5xx: fail closed        → 503

export type MentorAllowance =
  | { allowed: true }
  | {
      allowed: false;
      reason: MentorRefusalReason;
      /** The HTTP status the route should answer with */
      status: 429 | 503;
      /** User-facing, ready to show as is */
      message: string;
      /** ISO time the user can try again, or null when unknown */
      retryAt: string | null;
    };

/** Structurally compatible with Anthropic.Usage (final message or the last delta). */
export type MentorTokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

type BackendRefusalReason =
  | "disabled"
  | "not_in_pilot"
  | "monthly_cap"
  | "daily_limit";

type CheckData =
  | { allowed: true }
  | {
      allowed: false;
      reason: BackendRefusalReason;
      message: string;
      retryAt: string | null;
    };

const REFUSAL_STATUS: Record<BackendRefusalReason, 429 | 503> = {
  disabled: 503,
  not_in_pilot: 503,
  monthly_cap: 503,
  daily_limit: 429,
};

const UNAVAILABLE: MentorAllowance = {
  allowed: false,
  reason: "unavailable",
  status: 503,
  message: "Mentor couldn't start. Try again in a few minutes.",
  retryAt: null,
};

const RECORD_RETRIES = 2;

type RouteResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string | null };

/**
 * Calls a Mentor usage route (`backend/src/api/mentor-usage`) with the service
 * token. Bodies are `{ data }`, not v4 entries, so nothing is flattened. A
 * network failure is status 0.
 */
async function postMentorRoute<T>(
  path: "check" | "record",
  body: object,
): Promise<RouteResult<T>> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/mentor-usages/${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      const message: string | null = json?.error?.message ?? null;
      console.error(`POST ${url} failed:`, response.status, message);
      return { ok: false, status: response.status, message };
    }
    return { ok: true, data: json.data as T };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, status: 0, message: null };
  }
}

/**
 * Call before creating the Anthropic client. Never throws.
 * Only `{ allowed: true }` permits a model call.
 *
 * The backend answers first and the burst guard second, so a request Strapi
 * refuses doesn't use up a burst slot.
 */
export async function checkMentorAllowance(
  user: MentorUser,
): Promise<MentorAllowance> {
  const result = await postMentorRoute<CheckData>("check", {
    userId: user.id,
  });
  if (!result.ok || typeof result.data.allowed !== "boolean") {
    return UNAVAILABLE;
  }
  const answer = result.data;
  if (!answer.allowed) {
    const status = REFUSAL_STATUS[answer.reason];
    if (!status) return UNAVAILABLE;
    return {
      allowed: false,
      reason: answer.reason,
      status,
      message: answer.message,
      retryAt: answer.retryAt ?? null,
    };
  }

  const burst = checkRateLimit(user.email, user.roles, "mentor");
  if (!burst.allowed) {
    const retryAfterMs = burst.retryAfterMs ?? 0;
    return {
      allowed: false,
      reason: "rate_limited",
      status: 429,
      message: formatRateLimitError(retryAfterMs),
      retryAt: new Date(Date.now() + retryAfterMs).toISOString(),
    };
  }
  return { allowed: true };
}

/**
 * Writes one mentor-usage row. Retries twice on a network error or 5xx, never
 * throws, and resolves false if it could not save (already logged).
 */
export async function recordMentorUsage(input: {
  user: Pick<MentorUser, "id">;
  kind: MentorKind;
  model: MentorModel;
  usage: MentorTokenUsage;
}): Promise<boolean> {
  const { usage } = input;
  // Counted the ai-scoring way: cache reads and writes at the input price.
  const body = {
    userId: input.user.id,
    kind: input.kind,
    model: input.model,
    inputTokens:
      usage.input_tokens +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens,
  };
  try {
    for (let attempt = 0; attempt <= RECORD_RETRIES; attempt++) {
      const result = await postMentorRoute<{ id: number }>("record", body);
      if (result.ok) return true;
      if (result.status !== 0 && result.status < 500) break;
    }
  } catch (error) {
    console.error("Mentor usage record failed:", error);
  }
  console.error(
    `Mentor usage not saved (user ${input.user.id}, ${input.kind}, ${input.model}, ${body.inputTokens} in / ${body.outputTokens} out)`,
  );
  return false;
}
