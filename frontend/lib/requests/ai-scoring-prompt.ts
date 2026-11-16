"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth/guards";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { isDefaultPart, type PromptParts } from "@/lib/ai-review/system-prompt";
import { aiScoringPromptSchema } from "@/lib/validations/ai-scoring-prompt";
import type { ReviewActionResult } from "@/lib/requests/reviews";

/** Saves the Scorecard prompt wording (System Admin only); default or blank parts are stored as null. */
export async function saveAiScoringPrompt(
  input: PromptParts,
): Promise<ReviewActionResult<{ custom: Record<keyof PromptParts, boolean> }>> {
  return withAuth([AuthorizedUserRoleTitle.SysAdmin], async () => {
    try {
      const parsed = aiScoringPromptSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const keys = Object.keys(parsed.data) as (keyof PromptParts)[];
      const data = Object.fromEntries(
        keys.map((k) => [
          k,
          isDefaultPart(k, parsed.data[k]) ? null : parsed.data[k],
        ]),
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/ai-scoring-setting/prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
          body: JSON.stringify({ data }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const json = await readJsonOrNull(response).catch(() => null);
        console.error("saveAiScoringPrompt failed:", response.status);
        return {
          ok: false,
          error: response.status === 400 ? "invalid_input" : "failed",
          data: null,
          message: json?.error?.message ?? null,
        };
      }

      revalidatePath("/admin/scorecard-prompts");
      return {
        ok: true,
        error: null,
        data: {
          custom: {
            instructions: data.instructions !== null,
            lessonScope: data.lessonScope !== null,
            overallScope: data.overallScope !== null,
          },
        },
      };
    } catch (error) {
      console.error("saveAiScoringPrompt failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}
