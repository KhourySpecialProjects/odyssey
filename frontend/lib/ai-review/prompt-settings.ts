import "server-only";
import { createHash } from "node:crypto";
import { fetchAPI } from "@/lib/utils";
import { PROMPT_VERSION } from "./prompt";
import {
  DEFAULT_PROMPT,
  isDefaultPart,
  type PromptParts,
} from "./system-prompt";

export type StoredPrompt = { [K in keyof PromptParts]: string | null };

export type ResolvedPrompt = {
  parts: PromptParts;
  version: string;
  /** Which parts hold saved custom text */
  custom: Record<keyof PromptParts, boolean>;
};

const KEYS = Object.keys(DEFAULT_PROMPT) as (keyof PromptParts)[];

/** Reads the saved prompt text, fresh each time. Throws on failure. */
export async function loadStoredPrompt(): Promise<StoredPrompt> {
  const row = await fetchAPI<Partial<StoredPrompt> | null>(
    "/ai-scoring-setting",
    { urlParams: { fields: [...KEYS] }, cache: "no-store" },
  );
  return {
    instructions: row?.instructions ?? null,
    lessonScope: row?.lessonScope ?? null,
    overallScope: row?.overallScope ?? null,
  };
}

/** Falls back to the code default for each part that is null, blank or default. */
export function resolvePrompt(stored: StoredPrompt): ResolvedPrompt {
  const custom = {} as ResolvedPrompt["custom"];
  const parts = {} as PromptParts;
  for (const key of KEYS) {
    const text = stored[key];
    custom[key] = text != null && !isDefaultPart(key, text);
    parts[key] = custom[key] ? text!.trim() : DEFAULT_PROMPT[key];
  }
  if (!KEYS.some((k) => custom[k])) {
    return { parts, version: PROMPT_VERSION, custom };
  }
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        parts.instructions,
        parts.lessonScope,
        parts.overallScope,
      ]),
    )
    .digest("hex")
    .slice(0, 8);
  return { parts, version: `${PROMPT_VERSION}+${hash}`, custom };
}

export type PromptSavedBy = { name: string | null; at: string };

/** Who saved the prompts last and when (ODY-915); null if unknown or the read fails. */
export async function loadPromptSavedBy(): Promise<PromptSavedBy | null> {
  try {
    const row = await fetchAPI<{
      promptUpdatedAt?: string | null;
      promptUpdatedBy?: {
        firstName?: string | null;
        lastName?: string | null;
      } | null;
    } | null>("/ai-scoring-setting", {
      urlParams: {
        fields: ["promptUpdatedAt"],
        populate: { promptUpdatedBy: { fields: ["firstName", "lastName"] } },
      },
      cache: "no-store",
    });
    if (!row?.promptUpdatedAt) return null;
    const user = row.promptUpdatedBy;
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
    return { name, at: row.promptUpdatedAt };
  } catch {
    return null;
  }
}
