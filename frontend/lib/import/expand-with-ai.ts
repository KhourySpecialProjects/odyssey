"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit, formatRateLimitError } from "./rate-limiter";

/**
 * Expand condensed slide/PDF content into educational prose.
 * Takes bullet points and short phrases and produces clear, readable
 * lesson content suitable for self-paced online learning.
 */
export async function expandLessonContent(
  title: string,
  condensedContent: string,
): Promise<{ expanded: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return {
      expanded: condensedContent,
      error: "You must be signed in to use AI expansion.",
    };
  }

  const { allowed, retryAfterMs } = checkRateLimit(
    user.email,
    user.roles ?? [],
    "expand",
  );
  if (!allowed) {
    return {
      expanded: condensedContent,
      error: formatRateLimitError(retryAfterMs ?? 0),
    };
  }

  if (!condensedContent.trim()) {
    return { expanded: condensedContent };
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
  });

  const prompt = `You are an education content writer for an online learning platform. You are given a lesson title and condensed content (typically from presentation slides — bullet points, keywords, short phrases).

Your job is to expand this into clear, educational prose that a student can learn from independently.

Rules:
- Turn bullet points into well-written paragraphs with explanations
- Add context and examples where helpful, but stay accurate to the source material
- Keep technical terms but explain them when first introduced
- Use markdown formatting: **bold** for key terms, headings for subsections if needed
- Maintain the same topic scope — don't add unrelated information
- Keep it concise but complete — aim for 2-4 paragraphs per major point
- Preserve any code snippets, formulas, or specific values exactly as they appear
- Do NOT add a title/heading at the top (the lesson title is handled separately)
- Output ONLY the expanded markdown content, no preamble

Lesson title: ${title}

Content to expand:
${condensedContent}`;

  try {
    const msg = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      msg.content[0].type === "text" ? msg.content[0].text : "";

    if (!responseText.trim()) {
      return {
        expanded: condensedContent,
        error: "AI returned empty response",
      };
    }

    return { expanded: responseText.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      expanded: condensedContent,
      error: `Expansion failed: ${message}`,
    };
  }
}
