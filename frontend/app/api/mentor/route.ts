import { after } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { lessonAccess } from "@/lib/lesson-access";
import { streamMentorAnswer } from "@/lib/mentor/answer";
import { resolveMentorAsk } from "@/lib/mentor/ask";
import { mentorClient } from "@/lib/mentor/client";
import { buildLessonContext } from "@/lib/mentor/context";
import type { MentorHttpError, MentorHttpErrorCode } from "@/lib/mentor/events";
import { buildMentorRequest, MENTOR_SETUP } from "@/lib/mentor/prompt";
import { getMentorSource } from "@/lib/mentor/source";
import { checkMentorAllowance, recordMentorUsage } from "@/lib/mentor/usage";
import { mentorRequestSchema } from "@/lib/validations/mentor";

// POST /api/mentor (ODY-886): every Mentor answer, streamed as server-sent
// events; the contract is in lib/mentor/events.ts. Route handlers aren't
// covered by the "use server" auth guard, so every check is here, in this
// order: sign-in, the body, the droplet and lesson, the ask, then ODY-884's
// allowance. None of them calls Claude. The browser sends ids only: the
// lesson comes from Strapi, and quiz answers never reach the model.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The largest valid body is about 30 KB */
const MAX_BODY_BYTES = 64 * 1024;

const MESSAGES = {
  unauthenticated: "Sign in to use Mentor.",
  too_large: "That request is too long for Mentor.",
  invalid_request: "Mentor couldn't read that request.",
  not_found: "Mentor couldn't find that lesson.",
  forbidden: "Mentor is only available on published lessons.",
  cannot_answer: "Mentor can't help with that one.",
  model_unavailable: "Mentor couldn't start an answer. Try again in a minute.",
  internal: "Something went wrong with Mentor. Try again.",
} satisfies Partial<Record<MentorHttpErrorCode, string>>;

function refuse(
  status: number,
  error: MentorHttpErrorCode,
  message: string,
  retryAt?: string | null,
) {
  const body: MentorHttpError = {
    error,
    message,
    ...(retryAt !== undefined && { retryAt }),
  };
  // Whole seconds until retryAt, rounded up
  const waitS = retryAt
    ? Math.max(0, Math.ceil((Date.parse(retryAt) - Date.now()) / 1000))
    : null;
  return Response.json(body, {
    status,
    headers: waitS === null ? undefined : { "Retry-After": `${waitS}` },
  });
}

const fail = (status: number, error: keyof typeof MESSAGES) =>
  refuse(status, error, MESSAGES[error]);

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const gate = await requireRole([]);
    if (!gate.ok) return fail(401, "unauthenticated");

    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
      return fail(413, "too_large");
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, "too_large");
    const parsed = mentorRequestSchema.safeParse(parseJson(raw));
    if (!parsed.success) return fail(400, "invalid_request");
    const input = parsed.data;

    const source = await getMentorSource(input.dropletId, input.lessonId);
    const access = source && lessonAccess(source.droplet, input.lessonId);
    if (!source?.lesson || !access?.ok) return fail(404, "not_found");
    if (!access.mentor) return fail(403, "forbidden");

    const context = buildLessonContext(source.lesson, source.droplet);
    const resolved = resolveMentorAsk(source.lesson, context, input);
    if (!resolved.ok) {
      // The reason only: never the student's words
      console.info(`[mentor] can't answer: ${resolved.error}`);
      return fail(400, "cannot_answer");
    }

    const allowance = await checkMentorAllowance(gate.user);
    if (!allowance.allowed) {
      const { status, reason, message, retryAt } = allowance;
      return refuse(status, reason, message, retryAt);
    }

    const answer = await streamMentorAnswer({
      client: mentorClient(),
      params: buildMentorRequest(context, resolved.ask),
      context,
      signal: request.signal,
    });
    if (!answer) return fail(502, "model_unavailable");

    // Once the answer has ended, however it ended
    after(async () => {
      const usage = await answer.usage;
      if (!usage) return;
      await recordMentorUsage({
        user: gate.user,
        kind: input.kind,
        model: MENTOR_SETUP.model,
        usage,
      });
    });
    return answer.response;
  } catch (error) {
    console.error("[mentor] the route failed:", error);
    return fail(500, "internal");
  }
}
