import { LINK_PATTERN, REF_PATTERN } from "./refs";

/** A linked phrase's Markdown href: this, then its ref ("#mentor-source-p3") */
export const SOURCE_HREF = "#mentor-source-";

// A ref (with the space before it) and, while streaming, a ref still arriving
const REF = new RegExp(`[ \\t]*${REF_PATTERN.source}`, "g");
const PARTIAL_REF = /[ \t]*\[(p\d*(\s*,\s*p?\d*)*)?$/;
// A linked phrase's words still arriving, before its ref
const PARTIAL_LINK = /\[([^[\]\n]*)\]?$/;

/**
 * The answer as shown: no [pN] refs, even one split across streamed chunks.
 * A linked phrase, "[the words][p3]", shows as its words. With its ref in
 * `linkRefs`, it becomes a Markdown link to `${SOURCE_HREF}p3` instead, for
 * the sidebar to turn into a button; a link with several refs never does.
 * While streaming, a half-arrived link shows as its words too.
 */
export function displayAnswer(
  raw: string,
  { streaming, linkRefs = [] }: { streaming: boolean; linkRefs?: string[] },
): string {
  const text = raw
    .replace(LINK_PATTERN, (_, words: string, ref: string) => {
      const shown = words.trim();
      if (!shown || !linkRefs.includes(ref)) return shown;
      return `[${shown}](${SOURCE_HREF}${ref})`;
    })
    .replace(REF, "");
  return (
    streaming ? text.replace(PARTIAL_REF, "").replace(PARTIAL_LINK, "$1") : text
  ).replace(/^[ \t]+/, "");
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
