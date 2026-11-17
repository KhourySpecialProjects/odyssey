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
      error:
        | "unauthenticated"
        | "forbidden"
        | "invalid"
        | "not_found"
        | "not_enrolled"
        | "limit"
        | "failed";
    };

const STATUS_ERRORS: Record<number, "not_enrolled" | "not_found" | "limit"> = {
  403: "not_enrolled",
  404: "not_found",
  429: "limit",
};

/** Saves one quiz submit (ids and result, never the answer) for the signed-in student (ODY-939). */
export async function recordQuizAttempt(input: unknown): Promise<RecordResult> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = quizAttemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const body = parsed.data;

  const source = await getMentorSource(body.dropletId, body.lessonId);
  const access = source && lessonAccess(source.droplet, body.lessonId);
  if (!source?.lesson || !access?.ok) return { ok: false, error: "not_found" };
  const known =
    body.quizType === "choice"
      ? choiceQuestionById(source.lesson, body.questionId) !== null
      : hasOpenEndedQuestion(source.lesson, body.questionId);
  if (!known) return { ok: false, error: "invalid" };

  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/quiz-attempts/record`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({ ...body, userId: gate.user.id }),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      console.error(`POST ${url} failed:`, response.status);
      return { ok: false, error: STATUS_ERRORS[response.status] ?? "failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, error: "failed" };
  }
}
