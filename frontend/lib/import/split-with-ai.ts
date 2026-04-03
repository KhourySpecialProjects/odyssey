"use server";

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import type { ImportSection } from "./types";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit, formatRateLimitError } from "./rate-limiter";

interface LessonSplit {
  title: string;
  startLine: number;
  endLine: number;
}

interface SplitResponse {
  lessons: LessonSplit[];
  warnings?: string[];
}

const PDF_MARKER = /--- Page (\d+) ---/g;
const PPTX_MARKER = /--- Slide (\d+) ---/g;

/**
 * Use Claude Haiku to split extracted document text into lessons.
 * Index-based: AI returns line ranges, we slice the text locally.
 * This minimizes output tokens (~97% cheaper than echoing content back).
 */
export async function splitTextWithAI(
  rawText: string,
  fileType: "pdf" | "pptx",
  fileName: string,
): Promise<{ sections: ImportSection[]; warnings: string[] }> {
  const user = await getCurrentUser();
  if (!user?.email) {
    throw new Error("You must be signed in to use AI splitting.");
  }

  const { allowed, retryAfterMs } = checkRateLimit(
    user.email,
    user.roles ?? [],
    "split",
  );
  if (!allowed) {
    throw new Error(formatRateLimitError(retryAfterMs ?? 0));
  }

  if (!rawText.trim()) {
    throw new Error("No text content to split into lessons.");
  }

  const lines = rawText.split("\n");
  const numberedText = lines.map((line, i) => `${i + 1}: ${line}`).join("\n");

  const truncated = numberedText.length > 100_000;
  const text = truncated ? numberedText.slice(0, 100_000) : numberedText;
  const totalLines = lines.length;

  const docType =
    fileType === "pdf" ? "PDF document" : "PowerPoint presentation";

  const prompt = `You are an education content specialist. Below is numbered text extracted from a ${docType} called "${fileName}".

Split this into logical lessons for an online learning platform. Each lesson should cover one topic or concept.

Rules:
- Each lesson MUST have a clear, descriptive title (not "Lesson 1" or "Part 1")
- Combine very short sections into one lesson
- Keep related content together
- Return between 1 and 30 lessons
- Line numbers are 1-based and inclusive
- Every line must belong to exactly one lesson (no gaps, no overlaps)
- startLine of the first lesson must be 1
- endLine of the last lesson must be ${totalLines}

Respond with ONLY valid JSON, no other text:
{"lessons":[{"title":"Descriptive Title","startLine":1,"endLine":15},{"title":"Another Title","startLine":16,"endLine":30}]}

Text:
${text}`;

  // Fresh client per request — Server Actions may run concurrently
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
  });

  try {
    const msg = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      msg.content[0].type === "text" ? msg.content[0].text : "";

    const parsed = JSON.parse(responseText) as SplitResponse;

    if (
      !parsed.lessons ||
      !Array.isArray(parsed.lessons) ||
      parsed.lessons.length === 0
    ) {
      throw new Error("AI returned no lessons.");
    }

    const sections: ImportSection[] = parsed.lessons.map((lesson) => {
      const start = Math.max(1, Math.min(lesson.startLine, lines.length));
      const end = Math.max(start, Math.min(lesson.endLine, lines.length));
      const content = lines
        .slice(start - 1, end)
        .join("\n")
        .trim();
      const sourceInfo = deriveSourceInfo(content, fileType, start, end);

      return {
        id: uuidv4(),
        title: lesson.title,
        markdownContent: content,
        sourceInfo,
      };
    });

    const warnings: string[] = parsed.warnings ?? [];
    if (truncated) {
      warnings.push(
        "Document was truncated due to length. Only the first ~100,000 characters were processed.",
      );
    }

    const nonEmpty = sections.filter(
      (s) => s.markdownContent.trim().length > 0,
    );
    if (nonEmpty.length === 0) {
      throw new Error("AI splitting produced no lessons with content.");
    }

    return { sections: nonEmpty, warnings };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("AI returned an invalid response. Please try again.");
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI splitting failed: ${message}`);
  }
}

/**
 * Derive a human-readable source hint from page/slide markers in the content.
 */
function deriveSourceInfo(
  content: string,
  fileType: "pdf" | "pptx",
  startLine: number,
  endLine: number,
): string {
  const pattern = fileType === "pdf" ? PDF_MARKER : PPTX_MARKER;
  const unit = fileType === "pdf" ? "Page" : "Slide";

  // Reset lastIndex since these are global regexes reused across calls
  pattern.lastIndex = 0;

  const numbers: number[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    numbers.push(parseInt(match[1], 10));
  }

  if (numbers.length === 0) {
    return `Lines ${startLine}-${endLine}`;
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return min === max ? `${unit} ${min}` : `${unit}s ${min}-${max}`;
}
