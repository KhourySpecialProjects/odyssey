"use server";

import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { saveLearnerProfile } from "@/lib/learner-profile";
import { strapiEntryUrl } from "@/lib/strapi-document-id";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { UpdateUserInfoSelfSchema } from "@/lib/validations/authorized-user";
import { onboardingAnswersSchema } from "@/lib/validations/onboarding";
import type { OnboardingAnswers } from "@/lib/validations/onboarding";
import type { OnboardingResult } from "@/components/onboarding/onboarding-quiz";

const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;
const SAVE_ERROR = "Couldn't save your answers. Try again.";
const fail = (): OnboardingResult => ({ ok: false, error: SAVE_ERROR });

type Self = { id: number; documentId?: string; email: string };

/** One checked PUT to the student's own record. Logs only a status code. */
async function putSelf(user: Self, data: Record<string, unknown>) {
  const res = await fetch(
    await strapiEntryUrl("authorized-users", {
      id: user.id,
      documentId: user.documentId,
    }),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({ data }),
    },
  );
  if (!res.ok) {
    console.error("saveOnboarding: profile write failed", res.status);
    return false;
  }
  return true;
}

/** Saves the onboarding quiz for the signed-in student (ODY-964). */
export async function saveOnboarding(
  answers: OnboardingAnswers,
): Promise<OnboardingResult> {
  const gate = await requireRole([]);
  if (!gate.ok) return fail();
  const { user } = gate;

  const parsed = onboardingAnswersSchema.safeParse(answers);
  if (!parsed.success) return fail();
  const a = parsed.data;

  // Same schema a student's own profile edits use; empty bio clears it.
  const profile = UpdateUserInfoSelfSchema.safeParse({
    first: a.firstName,
    last: a.lastName,
    bio: a.bio || null,
  });
  if (!profile.success) return fail();

  try {
    const wrote = await putSelf(user, {
      firstName: profile.data.first,
      lastName: profile.data.last,
      bio: profile.data.bio,
      timeZone: a.timeZone,
    });
    if (!wrote) return fail();

    const saved = await saveLearnerProfile(user, {
      goal: a.goal,
      focusAreas: a.focusAreas,
      interestTagIds: a.interestTagIds,
      interestNote: a.interestNote,
    });
    if (!saved.ok) return fail();

    // Last, so a failed save shows the quiz again next time.
    if (!(await putSelf(user, { firstTime: false }))) return fail();
  } catch (error) {
    console.error(
      "saveOnboarding failed",
      error instanceof Error ? error.name : "unknown",
    );
    return fail();
  }

  revalidateTag(CACHE_TAGS.user(user.email));
  revalidateTag(CACHE_TAGS.recommendations(user.id));
  return { ok: true };
}
