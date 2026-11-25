import { after } from "next/server";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { requireRole } from "@/lib/auth/require-role";
import { lessonAccess } from "@/lib/lesson-access";
import { streamMentorAnswer } from "@/lib/mentor/answer";
import { resolveMentorAsk } from "@/lib/mentor/ask";
import { mentorClient } from "@/lib/mentor/client";
import {
  errorName,
  ownedChat,
  saveMentorExchange,
  startMentorChat,
  type MentorChatRow,
} from "@/lib/mentor/chat-history";
import {
  hintReply,
  storeCachedReplyWhenDone,
  summaryReply,
  replayCachedReply,
} from "@/lib/mentor/cached-reply";
import { findCachedReply } from "@/lib/mentor/cached-reply-store";
import { buildLessonContext } from "@/lib/mentor/context";
import type { MentorHttpError, MentorHttpErrorCode } from "@/lib/mentor/events";
import {
  buildMentorRequest,
  MENTOR_SETUP,
  MENTOR_SUMMARY_SETUP,
} from "@/lib/mentor/prompt";
import { getMentorSource } from "@/lib/mentor/source";
import { isSummaryRequest } from "@/lib/mentor/summary-request";
import {
  checkMentorAccess,
  checkMentorAllowance,
  recordMentorUsage,
} from "@/lib/mentor/usage";
import { mentorRequestSchema } from "@/lib/validations/mentor";

// POST /api/mentor (ODY-886): every Mentor answer, streamed as server-sent
// events; the contract is in lib/mentor/events.ts. Route handlers aren't
// covered by the "use server" auth guard, so every check is here, in this
// order: sign-in, the body, the droplet and lesson, the ask, then ODY-884's
// allowance. None of them calls Claude. A saved summary or quiz explanation (ODY-967) is looked
// up after the ask, and on a hit only Mentor's switch and the pilot are
// checked. The browser sends ids only: the lesson comes from Strapi, and quiz
// answers never reach the model.

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

/** Tells the model where a chat continued from another lesson began, in one line */
function startNote(chat: MentorChatRow, lessonId: number): string | null {
  if (chat.lesson?.id === lessonId) return null;
  // Titles are creator text: no tag or line breaks, bounded length
  const clean = (name?: string | null) =>
    (name ?? "")
      .replace(/[<>\r\n]+/g, " ")
      .trim()
      .slice(0, 120);
  const lesson = clean(chat.lesson?.name);
  const droplet = clean(chat.droplet?.name);
  return lesson && droplet
    ? `This chat started in ${lesson} (${droplet}).`
    : "This chat started in another lesson.";
}

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

    // ODY-967: a summary is one saved reply per lesson version, and a wrong
    // pick's explanation one per question and pick, shared by every student.
    // A saved reply calls no model, so only Mentor's switch and the pilot can
    // refuse it.
    const ids = { dropletId: input.dropletId, lessonId: input.lessonId };
    // ODY-968: summaries run on their own setup; everything else on Mentor's
    const setup =
      input.kind === "lesson" &&
      isSummaryRequest(input.message, { hasHistory: !!input.history?.length })
        ? MENTOR_SUMMARY_SETUP
        : MENTOR_SETUP;
    const reply =
      setup === MENTOR_SUMMARY_SETUP
        ? summaryReply(context, ids, { setup })
        : resolved.ask.kind === "quiz-hint"
          ? hintReply(context, resolved.ask, ids)
          : null;
    const saved = reply ? await findCachedReply(reply.key) : null;
    const allowance = saved
      ? await checkMentorAccess(gate.user)
      : await checkMentorAllowance(gate.user);
    if (!allowance.allowed) {
      const { status, reason, message, retryAt } = allowance;
      return refuse(status, reason, message, retryAt);
    }
    // A hit skips the live burst guard. A summary hit still writes a chat row,
    // so all hits share their own limit. Same refusal as checkMentorAllowance's
    // burst guard.
    if (saved) {
      const limit = checkRateLimit(
        gate.user.email,
        gate.user.roles,
        "mentor-saved",
      );
      if (!limit.allowed) {
        const retryAfterMs = limit.retryAfterMs ?? 0;
        return refuse(
          429,
          "rate_limited",
          formatRateLimitError(retryAfterMs),
          new Date(Date.now() + retryAfterMs).toISOString(),
        );
      }
    }

    // ODY-937: any saved chat of this kind continues on any lesson; quiz hints are never saved
    let own: MentorChatRow | null = null;
    let chatLookupFailed = false;
    if (input.kind !== "quiz-hint" && input.chatId) {
      try {
        own = await ownedChat(gate.user.id, input.chatId, { kind: input.kind });
      } catch (error) {
        chatLookupFailed = true;
        console.error("[mentor] chat lookup failed:", errorName(error));
      }
    }

    // A reply's request is the one its key names: no note, no learner block
    const params = reply?.params ?? buildMentorRequest(context, resolved.ask);
    const note = !reply && own && startNote(own, input.lessonId);
    // After the cached lesson block, so the cached prefix stays the lesson's
    if (note) {
      const first = params.messages[0].content;
      if (Array.isArray(first))
        first.splice(1, 0, { type: "text", text: note });
    }

    if (saved && reply) console.info(`[mentor] saved reply hit, ${reply.slot}`);
    const answer = saved
      ? replayCachedReply({ text: saved, context, signal: request.signal })
      : await streamMentorAnswer({
          client: mentorClient(),
          params,
          context,
          signal: request.signal,
        });
    if (!answer) return fail(502, "model_unavailable");

    // ODY-937: quiz hints are never saved; a failure here never costs the answer
    let chatId: string | null = null;
    if (input.kind !== "quiz-hint" && !chatLookupFailed) {
      try {
        chatId =
          own?.documentId ??
          (await startMentorChat({
            userId: gate.user.id,
            dropletId: input.dropletId,
            lessonId: input.lessonId,
            kind: input.kind,
            title: input.kind === "lesson" ? input.message : input.selection,
          }));
        answer.response.headers.set("X-Mentor-Chat-Id", chatId);
      } catch (error) {
        chatId = null;
        console.error("[mentor] chat start failed:", errorName(error));
      }
    }

    // Once the answer has ended, however it ended
    after(async () => {
      const usage = await answer.usage;
      if (usage) {
        await recordMentorUsage({
          user: gate.user,
          kind: input.kind,
          model: setup.model,
          usage,
        });
      }
      const done = await answer.completed;
      if (!chatId || !done || input.kind === "quiz-hint") return;
      try {
        await saveMentorExchange({
          chatDocumentId: chatId,
          userId: gate.user.id,
          question: input.kind === "lesson" ? input.message : input.selection,
          answer: done.text,
          citations: done.citations,
        });
      } catch (error) {
        console.error("[mentor] chat save failed:", errorName(error));
      }
    });
    if (reply && !saved) {
      after(() => storeCachedReplyWhenDone(reply, answer.completed));
    }
    return answer.response;
  } catch (error) {
    console.error("[mentor] the route failed:", error);
    return fail(500, "internal");
  }
}
