"use server";

import { requireRole } from "@/lib/auth/require-role";
import { lessonAccess } from "@/lib/lesson-access";
import { MENTOR_PROMPT_VERSION } from "@/lib/mentor/prompt";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import { getMentorSource } from "@/lib/mentor/source";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { mentorFeedbackSchema } from "@/lib/validations/mentor-feedback";

type SaveResult =
  | { ok: true; canShare: boolean; promptVersion: string }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "forbidden"
        | "invalid"
        | "not_found"
        | "sharing_off"
        | "limit"
        | "failed";
    };

const STATUS_ERRORS: Record<number, "sharing_off" | "not_found" | "limit"> = {
  403: "sharing_off",
  404: "not_found",
  429: "limit",
};

/** Records one 👍/👎 (and the opt-in shared text) for a Mentor answer (ODY-890). */
export async function saveMentorFeedback(input: unknown): Promise<SaveResult> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = mentorFeedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const body = parsed.data;
  if ((body.kind === "quiz-hint") !== (body.questionId !== undefined)) {
    return { ok: false, error: "invalid" };
  }

  const source = await getMentorSource(body.dropletId, body.lessonId);
  const access = source && lessonAccess(source.droplet, body.lessonId);
  if (!source?.lesson || !access?.ok || !access.mentor) {
    return { ok: false, error: "not_found" };
  }
  if (
    body.questionId !== undefined &&
    !findQuizQuestion(source.lesson, body.questionId)
  ) {
    return { ok: false, error: "invalid" };
  }

  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/mentor-feedbacks/record`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        ...body,
        userId: gate.user.id,
        promptVersion: MENTOR_PROMPT_VERSION,
      }),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      console.error(`POST ${url} failed:`, response.status);
      return { ok: false, error: STATUS_ERRORS[response.status] ?? "failed" };
    }
    return {
      ok: true,
      canShare: json.data.canShare === true,
      promptVersion: MENTOR_PROMPT_VERSION,
    };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, error: "failed" };
  }
}
