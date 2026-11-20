import type { MentorAsk } from "./ask";
import { buildMentorRequest, MENTOR_SETUP, type MentorSetup } from "./prompt";
import type { LessonContext } from "./types";

// ODY-967: which messages ask only for a summary, and the one request that
// answers all of them. No "server-only": like prompt.ts, scripts may import
// it. The client-boundary test keeps it out of client files.
//
// Only `kind: "lesson"` messages are checked. A highlighted selection is sent
// as `explain`, so it never matches. If a `lesson` ask ever gains a
// selection, its caller must skip the check.

/** The sheet's starter (mentor-sheet.tsx), and the ask every summary is built from */
export const SUMMARY_MESSAGE = "Summarize this lesson";

const SUMMARY_PHRASES = new Set([
  "summarise",
  "summarize",
  "summary",
  "sum up",
  "tldr",
]);

const FILLER = new Set([
  "the",
  "lesson",
  "page",
  "please",
  "can",
  "could",
  "you",
  "me",
  "give",
  "a",
  "quick",
  "short",
  "brief",
  "of",
  "i",
  "get",
  "want",
  "an",
  "to",
  "would",
  "just",
  "whole",
  "briefly",
  "pls",
  "plz",
  "for",
  "all",
]);

// With earlier turns, a bare "it" or "this" probably points at Mentor's last
// answer ("summarize it"), so it isn't filler; "this lesson" still is.
const CHAT_ONLY_FILLER = new Set(["it", "this"]);

/**
 * True when the message asks for a summary of this lesson and nothing else.
 * The route passes `hasHistory: input.history.length > 0`: mid-chat, "summarize
 * it" and "summarize this" go to Mentor live, but "summarize this lesson",
 * "summarise" and "quick summary" still match.
 */
export function isSummaryRequest(
  message: string,
  { hasHistory = false }: { hasHistory?: boolean } = {},
): boolean {
  const text = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\bthis lesson\b/g, "lesson");
  const words = text
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        !FILLER.has(word) &&
        !(!hasHistory && CHAT_ONLY_FILLER.has(word)),
    );
  return SUMMARY_PHRASES.has(words.join(" "));
}

/** The one ask every summary is answered with: no history, so no student words */
export const summaryAsk = (): MentorAsk => ({
  kind: "lesson",
  message: SUMMARY_MESSAGE,
  history: [],
});

/** Built without options: no learner block (ODY-934/938) */
export const summaryRequest = (
  context: LessonContext,
  setup: MentorSetup = MENTOR_SETUP,
) => buildMentorRequest(context, summaryAsk(), setup);
