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
      type: "insert-two-column-break";
      afterBlockIndex: number;
      columnBreakAfterIndex: number;
    };

type BlockSummary = {
  index: number;
  type: string;
  textPreview: string;
  hasImage: boolean;
  imageUrl?: string;
};

const SYSTEM_PROMPT = `You insert slide breaks for a presentation editor. You can also create two-column slides.

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

## Two-Column Layout

Use two-column slides when content naturally pairs side-by-side:
- A code block + its explanation
- Two parallel lists (e.g. pros/cons, before/after)
- An image + descriptive text
- Two short independent paragraphs on the same topic

Do NOT use two-column for:
- Long prose paragraphs (they need full width)
- Quizzes or videos (they need full width)
- Content that has a clear sequential flow

## Rules

1. Do NOT insert a slide break before the first block or after the last block
2. If \`slide-break\` blocks already exist, work around them — do not duplicate
3. Each slide must stay under ~900px total estimated height
4. A slide with a \`notebook-code\` block should have at most 1–2 other blocks (heading + short paragraph)
5. NEVER put two \`notebook-code\` or \`code-block\` blocks on the same slide
6. NEVER insert consecutive slide breaks — leave at least 2 content blocks between breaks
7. Break at natural content boundaries (before headings, between topics, before/after images)
8. Two-column slides must have at least 2 content blocks (1+ per column)
9. The column break index must be between the slide break and the next slide break

## Response Format

Respond with ONLY a JSON array. No explanation, no markdown fences, no commentary.

Operation types:
- \`{"type": "insert-slide-break", "afterBlockIndex": N}\` — standard single-column slide break
- \`{"type": "insert-two-column-break", "afterBlockIndex": N, "columnBreakAfterIndex": M}\` — slide break with two-column layout; a column break is inserted after block M to split left/right columns`;

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
          content: `Insert slide breaks for these blocks:\n\n${JSON.stringify(blocks, null, 2)}`,
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
          Number.isInteger(op.afterBlockIndex) &&
          op.afterBlockIndex >= 0 &&
          op.afterBlockIndex < blockSummaries.length - 1
        );
      }
      if (op.type === "insert-two-column-break") {
        return (
          typeof op.afterBlockIndex === "number" &&
          typeof op.columnBreakAfterIndex === "number" &&
          Number.isInteger(op.afterBlockIndex) &&
          Number.isInteger(op.columnBreakAfterIndex) &&
          op.afterBlockIndex >= 0 &&
          op.afterBlockIndex < blockSummaries.length - 1 &&
          op.columnBreakAfterIndex > op.afterBlockIndex &&
          op.columnBreakAfterIndex < blockSummaries.length - 1
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
