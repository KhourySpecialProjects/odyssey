"use server";

import { requireRole } from "@/lib/auth/require-role";
import { lessonAccess } from "@/lib/lesson-access";
import { choiceQuestionById, hasOpenEndedQuestion } from "@/lib/mentor/quiz";
import { getMentorSource } from "@/lib/mentor/source";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { quizAttemptSchema } from "@/lib/validations/quiz-attempt";

type RecordResult =
  | { ok: true }
  | {
      ok: false;
      error: "unauthenticated" | "forbidden" | "not_saved" | "limit" | "failed";
    };

// One client code for every "can't save this" so ids and enrollment don't leak; detail is logged.
const STATUS_ERRORS: Record<number, "not_saved" | "limit"> = {
  403: "not_saved",
  404: "not_saved",
  429: "limit",
};

const notSaved = (reason: string, ids: object) => {
  console.warn(`Quiz attempt not saved: ${reason}`, ids);
  return { ok: false, error: "not_saved" } as const;
};

/** Rejects when `signal` aborts; the listener is removed once `work` settles. */
function withDeadline<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  return Promise.race([work, aborted]).finally(() =>
    signal.removeEventListener("abort", onAbort),
  );
}

/** Saves one quiz submit (ids and result, never the answer) for the signed-in student (ODY-939). */
export async function recordQuizAttempt(input: unknown): Promise<RecordResult> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = quizAttemptSchema.safeParse(input);
  if (!parsed.success) return notSaved("invalid body", {});
  const body = parsed.data;
  const ids = { dropletId: body.dropletId, lessonId: body.lessonId };

  // One deadline for the lookup and the POST: a hung Strapi must not hold the client's action queue.
  const signal = AbortSignal.timeout(3000);
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/quiz-attempts/record`;
  try {
    const source = await withDeadline(
      getMentorSource(body.dropletId, body.lessonId),
      signal,
    );
    const access = source && lessonAccess(source.droplet, body.lessonId);
    if (!source?.lesson || !access?.ok) return notSaved("not_found", ids);
    const known =
      body.quizType === "choice"
        ? choiceQuestionById(source.lesson, body.questionId) !== null
        : hasOpenEndedQuestion(source.lesson, body.questionId);
    if (!known) return notSaved("invalid question", ids);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({ ...body, userId: gate.user.id }),
      cache: "no-store",
      signal,
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      console.error(`POST ${url} failed:`, response.status, ids);
      return { ok: false, error: STATUS_ERRORS[response.status] ?? "failed" };
    }
    return { ok: true };
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    console.error(`Quiz attempt failed: ${detail}`, ids);
    return { ok: false, error: "failed" };
  }
}
