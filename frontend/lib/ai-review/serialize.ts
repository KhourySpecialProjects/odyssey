import { parse, HTMLElement, TextNode, type Node } from "node-html-parser";
import type { Block } from "@/types";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import type { DropletSnapshot, SnapshotLesson } from "./types";

/**
 * HTML as Markdown, keeping what the rubric judges: headings, lists, emphasis,
 * paragraph breaks, links, images and code. Runs without a browser DOM.
 */
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  const root = parse(html, { comment: false });
  return tidy(renderNodes(root.childNodes, { listDepth: 0 }));
}

type Ctx = { listDepth: number; pre?: boolean };

const SKIP = new Set(["script", "style", "noscript", "template"]);

function renderNodes(nodes: Node[], ctx: Ctx): string {
  return nodes.map((n) => renderNode(n, ctx)).join("");
}

function renderNode(node: Node, ctx: Ctx): string {
  if (node instanceof TextNode) {
    return ctx.pre ? node.text : node.text.replace(/\s+/g, " ");
  }
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.rawTagName?.toLowerCase() ?? "";
  if (SKIP.has(tag)) return "";

  // KaTeX keeps the source in a MathML annotation; the rest is presentation.
  if (node.classList?.contains("katex")) {
    const tex = node.querySelector('annotation[encoding="application/x-tex"]');
    return tex ? `$${tex.text.trim()}$` : "";
  }

  const inner = () => renderNodes(node.childNodes, ctx);

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return `\n\n${"#".repeat(Number(tag[1]))} ${inner().trim()}\n\n`;
    case "p":
    case "div":
    case "section":
    case "figure":
      return `\n\n${inner().trim()}\n\n`;
    case "br":
      return "\n";
    case "hr":
      return "\n\n---\n\n";
    case "strong":
    case "b":
      return wrap(inner(), "**");
    case "em":
    case "i":
      return wrap(inner(), "*");
    case "s":
    case "del":
      return wrap(inner(), "~~");
    case "code":
      return ctx.pre ? inner() : wrap(inner(), "`");
    case "pre":
      return `\n\n\`\`\`\n${renderNodes(node.childNodes, { ...ctx, pre: true }).trim()}\n\`\`\`\n\n`;
    case "a": {
      const text = inner().trim();
      const href = node.getAttribute("href");
      return href && text ? `[${text}](${href})` : text;
    }
    case "img": {
      const alt = node.getAttribute("alt")?.trim();
      return alt ? `[Image: ${alt}]` : "[Image, no alt text]";
    }
    case "iframe":
    case "video":
    case "audio":
      return `\n\n[Embedded ${tag === "audio" ? "audio" : "media"}: ${node.getAttribute("src") ?? "no source"}]\n\n`;
    case "blockquote":
      return `\n\n${tidy(inner())
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    case "ul":
    case "ol":
      return `\n\n${renderList(node, tag === "ol", ctx)}\n\n`;
    case "table":
      return `\n\n${renderTable(node, ctx)}\n\n`;
    default:
      return inner();
  }
}

function wrap(text: string, mark: string): string {
  const trimmed = text.trim();
  return trimmed ? `${mark}${trimmed}${mark}` : "";
}

function renderList(list: HTMLElement, ordered: boolean, ctx: Ctx): string {
  const indent = "  ".repeat(ctx.listDepth);
  const items = list.childNodes.filter(
    (n): n is HTMLElement =>
      n instanceof HTMLElement && n.rawTagName?.toLowerCase() === "li",
  );
  return items
    .map((li, i) => {
      const nested = { ...ctx, listDepth: ctx.listDepth + 1 };
      // A list item is one line plus its sub-items: no blank lines inside it.
      const text = tidy(renderNodes(li.childNodes, nested))
        .replace(/\n{2,}/g, "\n")
        .replace(/\n(?!\s*(-|\d+\.) )/g, `\n${indent}  `);
      return `${indent}${ordered ? `${i + 1}.` : "-"} ${text}`;
    })
    .join("\n");
}

function renderTable(table: HTMLElement, ctx: Ctx): string {
  return table
    .querySelectorAll("tr")
    .map(
      (tr) =>
        `| ${tr
          .querySelectorAll("th, td")
          .map((cell) =>
            tidy(renderNodes(cell.childNodes, ctx)).replace(/\n+/g, " "),
          )
          .join(" | ")} |`,
    )
    .join("\n");
}

/** Collapses runs of blank lines and trailing spaces. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A lesson's blocks, whichever editor made them, as labelled Markdown. */
export function lessonToMarkdown(lesson: SnapshotLesson): string {
  const blocks =
    lesson.blocksVersion === "v2"
      ? convertBlockNoteToV1Blocks(lesson.blocksV2 ?? [])
      : lesson.blocks ?? [];
  const parts = blocks.map(blockToMarkdown).filter(Boolean);
  return parts.length ? parts.join("\n\n") : "(This lesson has no content.)";
}

function blockToMarkdown(block: Block): string {
  switch (block.__component) {
    case "droplets.generic":
      return htmlToMarkdown(block.content);
    case "droplets.expandable":
      return `[Expandable section: ${block.title || "untitled"}]\n${htmlToMarkdown(block.content)}`;
    case "droplets.callout": {
      const text = (block.content ?? [])
        .map((p) => (p.children ?? []).map((c) => c.text).join(""))
        .join("\n");
      return `[Callout, ${block.type || "info"}]\n${text.trim()}`;
    }
    case "droplets.video":
      return `[Video: ${block.url || "no URL"}]`;
    case "droplets.quiz":
      return [
        "[Multiple-choice quiz]",
        ...(block.questions ?? []).map((q, i) =>
          [
            `Q${i + 1}. ${htmlToMarkdown(q.content)}`,
            ...(q.answerOptions ?? []).map(
              (o) => `  - ${o.isCorrect ? "(correct) " : ""}${o.content}`,
            ),
          ].join("\n"),
        ),
      ].join("\n");
    case "droplets.open-ended-quiz":
      return [
        "[Open-ended questions]",
        ...(block.questions ?? []).map(
          (q, i) =>
            `Q${i + 1}. ${htmlToMarkdown(q.content)}${
              q.correctAnswer ? `\n  Expected answer: ${q.correctAnswer}` : ""
            }`,
        ),
      ].join("\n");
    case "droplets.code-block": {
      const modes = [block.editable && "editable", block.runnable && "runnable"]
        .filter(Boolean)
        .join(", ");
      return `[Code block${block.language ? `, ${block.language}` : ""}${modes ? `, ${modes}` : ""}]\n\`\`\`${block.language ?? ""}\n${block.code ?? ""}\n\`\`\``;
    }
    case "droplets.sandpack-block":
      return `[Interactive code sandbox, ${block.template || "unknown"} template]${
        block.description ? `\n${block.description}` : ""
      }\nFiles: ${sandpackFileNames(block.files).join(", ") || "none"}`;
    default:
      return "";
  }
}

function sandpackFileNames(files: string): string[] {
  try {
    return Object.keys(JSON.parse(files) ?? {});
  } catch {
    return [];
  }
}

/** The droplet's own details: what every request needs to judge a lesson in context. */
export function dropletDetailsMarkdown(
  droplet: DropletSnapshot["droplet"],
): string {
  const lines = [
    `Name: ${droplet.name}`,
    droplet.type && `Kind: ${droplet.type}`,
    droplet.focusArea && `Focus area: ${droplet.focusArea}`,
    droplet.difficulty && `Difficulty: ${droplet.difficulty}`,
    droplet.description && `Description: ${droplet.description}`,
    "Learning objectives:",
    ...(droplet.learningObjectives.length
      ? droplet.learningObjectives.map((o) => `- ${o}`)
      : ["- (none listed)"]),
    "Prerequisite droplets:",
    ...(droplet.prerequisites.length
      ? droplet.prerequisites.map(
          (p) =>
            `- ${p.name}${p.description ? `: ${p.description}` : ""}${
              p.learningObjectives.length
                ? ` (objectives: ${p.learningObjectives.join("; ")})`
                : ""
            }`,
        )
      : ["- (none)"]),
  ];
  const overview = htmlToMarkdown(droplet.overview);
  if (overview) lines.push("Overview:", overview);
  return lines.filter(Boolean).join("\n");
}
