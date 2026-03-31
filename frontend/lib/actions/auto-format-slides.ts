"use server";

import Anthropic from "@anthropic-ai/sdk";

type AutoFormatOperation =
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

export async function autoFormatSlides(
  blockSummaries: BlockSummary[],
): Promise<{ operations: AutoFormatOperation[] } | { error: string }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Anthropic API key not configured" };
  }

  const blockList = blockSummaries
    .map((b) => {
      let desc = `[${b.index}] ${b.type}`;
      if (b.textPreview) desc += `: "${b.textPreview}"`;
      if (b.hasImage) desc += ` (image: ${b.imageUrl ?? "unknown"})`;
      return desc;
    })
    .join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are formatting lesson content for a slide presentation. Given the block list below, decide:

1. Where to insert slide breaks to create well-sized slides. Each slide should have roughly 3-8 blocks of content. Break at natural content boundaries (before headings, between topics, before/after images).
2. For any image blocks, what presentation layout to use:
   - "image-left": image on left, text on right (use when text follows the image)
   - "image-right": image on right, text on left (use when text precedes the image)
   - "full-image": image fills the whole slide (use for standalone images with no adjacent text)

Rules:
- Do NOT insert a slide break before the very first block.
- Do NOT insert a slide break after the very last block.
- If slide breaks already exist (type: "slide-break"), work around them — do not duplicate.
- Keep text-heavy slides to ~25 lines or fewer.
- Keep image+text slides to ~15 lines of text.

Respond with ONLY a JSON array of operations. No explanation, no markdown fences.

Operation types:
{"type":"insert-slide-break","afterBlockIndex":N}
{"type":"set-image-layout","blockIndex":N,"layout":"image-left"|"image-right"|"full-image"}

Block list:
${blockList}`,
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
          op.afterBlockIndex < blockSummaries.length
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
