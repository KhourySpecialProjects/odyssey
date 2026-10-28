import type { Block } from "@/types";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";

/**
 * Classic-editor lesson blocks as plain read-only HTML, for review comments
 * (ODY-806, Task 7). The block editors are separate TipTap editors with no
 * lasting block ids, so in Comment mode the lesson is shown as one HTML root
 * that comments anchor to by quote. The output still goes through DOMPurify.
 */

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type InlineNode = {
  type?: string;
  text?: string;
  url?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: InlineNode[];
};

type RichNode = InlineNode & {
  level?: number;
  format?: "ordered" | "unordered";
};

function inline(nodes: InlineNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "link") return inline(node.children);
      let html = escape(node.text ?? "");
      if (node.code) html = `<code>${html}</code>`;
      if (node.bold) html = `<strong>${html}</strong>`;
      if (node.italic) html = `<em>${html}</em>`;
      if (node.underline) html = `<u>${html}</u>`;
      if (node.strikethrough) html = `<s>${html}</s>`;
      return html;
    })
    .join("");
}

/** A callout's Strapi rich text (paragraphs, headings, lists, quotes, code) */
function richText(nodes: RichNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const level = Math.min(Math.max(node.level ?? 3, 2), 6);
          return `<h${level}>${inline(node.children)}</h${level}>`;
        }
        case "list": {
          const tag = node.format === "ordered" ? "ol" : "ul";
          return `<${tag}>${(node.children ?? [])
            .map((item) => `<li>${inline((item as RichNode).children)}</li>`)
            .join("")}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${inline(node.children)}</blockquote>`;
        case "code":
          return `<pre><code>${inline(node.children)}</code></pre>`;
        default:
          return `<p>${inline(node.children)}</p>`;
      }
    })
    .join("");
}

/** One Classic block as read-only HTML, or "" for one with no text */
export function classicBlockHtml(block: Block): string {
  switch (block.__component) {
    case "droplets.generic":
      return block.content === SLIDE_BREAK_MARKER ? "" : block.content;
    case "droplets.expandable":
      return `<p><strong>${escape(block.title ?? "")}</strong></p>${block.content ?? ""}`;
    case "droplets.callout":
      return `<div class="classic-review-callout">${richText(
        block.content as RichNode[],
      )}</div>`;
    case "droplets.video":
      return `<p class="classic-review-note">Video: ${escape(block.url ?? "")}</p>`;
    case "droplets.quiz":
      return (block.questions ?? [])
        .map(
          (q) =>
            `<div>${q.content ?? ""}</div><ul>${(q.answerOptions ?? [])
              .map(
                (o) =>
                  `<li>${o.content ?? ""}${o.isCorrect ? " (correct)" : ""}</li>`,
              )
              .join("")}</ul>`,
        )
        .join("");
    case "droplets.open-ended-quiz":
      return (block.questions ?? [])
        .map(
          (q) =>
            `<div>${q.content ?? ""}</div>${
              q.correctAnswer
                ? `<p class="classic-review-note">Expected answer: ${escape(q.correctAnswer)}</p>`
                : ""
            }`,
        )
        .join("");
    case "droplets.code-block":
      return `<pre><code>${escape(block.code ?? "")}</code></pre>`;
    case "droplets.sandpack-block":
      return block.description
        ? `<p class="classic-review-note">${escape(block.description)}</p>`
        : "";
    default:
      return "";
  }
}

/** A whole Classic lesson as read-only HTML, one section per block */
export const classicLessonHtml = (blocks: readonly Block[]) =>
  blocks
    .map((block) => classicBlockHtml(block))
    .filter(Boolean)
    .map((html) => `<section class="classic-review-block">${html}</section>`)
    .join("");
