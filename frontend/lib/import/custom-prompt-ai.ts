"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit, formatRateLimitError } from "./rate-limiter";

/**
 * Apply a custom user prompt to a selected portion of lesson markdown content.
 * Returns only the replacement text for the selected range.
 */
export async function customPromptAI(
  lessonTitle: string,
  fullContent: string,
  selectedText: string,
  userPrompt: string,
): Promise<{ result: string; error?: string }> {
  // Auth check
  const user = await getCurrentUser();
  if (!user?.email) {
    return {
      result: selectedText,
      error: "You must be signed in to use AI editing.",
    };
  }

  // Rate limit check
  const { allowed, retryAfterMs } = checkRateLimit(
    user.email,
    user.roles ?? [],
    "custom-prompt",
  );
  if (!allowed) {
    return {
      result: selectedText,
      error: formatRateLimitError(retryAfterMs ?? 0),
    };
  }

  // Input validation
  if (!selectedText.trim()) {
    return {
      result: selectedText,
      error: "Selected text cannot be empty.",
    };
  }

  if (!userPrompt.trim()) {
    return {
      result: selectedText,
      error: "Prompt cannot be empty.",
    };
  }

  if (userPrompt.length > 500) {
    return {
      result: selectedText,
      error: "Prompt must be under 500 characters.",
    };
  }

  const systemPrompt = `You are an education content editor for an online learning platform.
You will receive:
1. A lesson title (for context)
2. The full lesson content (for context)
3. A selected passage from the lesson
4. A user instruction describing how to modify that passage

Your task:
- Modify ONLY the selected passage according to the user's instruction
- Output ONLY the replacement text — no preamble, no explanation, no quotes
- Preserve markdown formatting (bold, italics, code blocks, lists, etc.)
- Keep the same approximate scope — don't massively expand or contract the passage
- Stay accurate to the lesson topic`;

  const userMessage = `Lesson title: ${lessonTitle}

Full lesson content (context only):
${fullContent}

Selected passage to modify:
${selectedText}

User instruction:
${userPrompt}`;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
  });

  try {
    const msg = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText =
      msg.content[0].type === "text" ? msg.content[0].text : "";

    if (!responseText.trim()) {
      return {
        result: selectedText,
        error: "AI returned empty response.",
      };
    }

    return { result: responseText.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      result: selectedText,
      error: `Custom prompt failed: ${message}`,
    };
  }
}
