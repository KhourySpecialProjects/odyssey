import { REF_PATTERN } from "./refs";

// A ref (with the space before it) and, while streaming, a ref still arriving
const REF = new RegExp(`[ \\t]*${REF_PATTERN.source}`, "g");
const PARTIAL_REF = /[ \t]*\[(p\d*(\s*,\s*p?\d*)*)?$/;

/** The answer as shown: no [pN] refs, even one split across streamed chunks. */
export function displayAnswer(
  raw: string,
  { streaming }: { streaming: boolean },
): string {
  const text = raw.replace(REF, "");
  return (streaming ? text.replace(PARTIAL_REF, "") : text).replace(
    /^[ \t]+/,
    "",
  );
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** A note's HTML: the question in bold, then the answer as paragraphs. */
export function answerNoteHtml(question: string, answer: string): string {
  const paragraphs = displayAnswer(answer, { streaming: false })
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`);
  return [
    `<p><strong>${escapeHtml(question)}</strong></p>`,
    ...paragraphs,
  ].join("");
}
