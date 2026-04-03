"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/session";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";

export type AutoFormatOperation =
  | { type: "insert-slide-break"; afterBlockIndex: number }
  | {
      type: "set-image-layout";
      blockIndex: number;
      layout: "image-left" | "image-right" | "full-image";
    };

type BlockSummary = {
  index: number;
  type: string;
  textPreview: string;
  hasImage: boolean;
  imageUrl?: string;
};

const SYSTEM_PROMPT = `You insert slide breaks and set image layouts for a presentation editor.

## Height Budget

Each slide must stay under **~900px** (1080p screen).

| Block type | Height |
|------------|--------|
| heading | ~60px |
| paragraph | ~40–120px depending on length |
| bulletListItem | ~36px each |
| notebook-code / code-block | **~300px** |
| image | ~400px |
| quiz-* | ~200px |
| video | ~360px |

## Image Layouts

- \`image-left\`: image on left, text on right — use when text follows the image
- \`image-right\`: image on right, text on left — use when text precedes the image
- \`full-image\`: image fills the whole slide — use for standalone images with no adjacent text

## Rules

1. Do NOT insert a slide break before the first block or after the last block
2. If \`slide-break\` blocks already exist, work around them — do not duplicate
3. Each slide must stay under ~900px total estimated height
4. A slide with a \`notebook-code\` block should have at most 1–2 other blocks (heading + short paragraph)
5. NEVER put two \`notebook-code\` or \`code-block\` blocks on the same slide
6. NEVER insert consecutive slide breaks — leave at least 2 content blocks between breaks
7. Break at natural content boundaries (before headings, between topics, before/after images)

## Response Format

Respond with ONLY a JSON array. No explanation, no markdown fences, no commentary.

Operation types:
- \`{"type": "insert-slide-break", "afterBlockIndex": N}\`
- \`{"type": "set-image-layout", "blockIndex": N, "layout": "image-left" | "image-right" | "full-image"}\``;

export async function autoFormatSlides(
  blockSummaries: BlockSummary[],
): Promise<{ operations: AutoFormatOperation[] } | { error: string }> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return { error: "You must be signed in to use auto-format." };
  }

  const { allowed, retryAfterMs } = checkRateLimit(
    user.email,
    user.roles ?? [],
    "auto-format",
  );
  if (!allowed) {
    return { error: formatRateLimitError(retryAfterMs ?? 0) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Anthropic API key not configured" };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const blocks = blockSummaries.map((b) => ({
    index: b.index,
    type: b.type,
    ...(b.textPreview && { text: b.textPreview }),
    ...(b.hasImage && { imageUrl: b.imageUrl }),
  }));

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Insert slide breaks and set image layouts for these blocks:\n\n${JSON.stringify(blocks, null, 2)}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const operations: AutoFormatOperation[] = JSON.parse(cleaned);

    const valid = operations.filter((op) => {
      if (op.type === "insert-slide-break") {
        return (
          typeof op.afterBlockIndex === "number" &&
          op.afterBlockIndex >= 0 &&
          op.afterBlockIndex < blockSummaries.length - 1
        );
      }
      if (op.type === "set-image-layout") {
        return (
          typeof op.blockIndex === "number" &&
          op.blockIndex >= 0 &&
          op.blockIndex < blockSummaries.length &&
          ["image-left", "image-right", "full-image"].includes(op.layout)
        );
      }
      return false;
    });

    return { operations: valid };
  } catch (err) {
    console.error("Auto-format slides failed:", err);

    if (err instanceof Anthropic.APIError) {
      if (err.status === 429)
        return { error: "Rate limited — try again in a moment." };
      if (err.status === 529)
        return { error: "Service overloaded — try again later." };
    }

    return { error: "Failed to auto-format slides. Please try again." };
  }
}
