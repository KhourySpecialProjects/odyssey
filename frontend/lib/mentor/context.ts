import type { BlocksContent } from "@strapi/blocks-react-renderer";
import { parse, HTMLElement, type Node } from "node-html-parser";
import { htmlToMarkdown } from "@/lib/ai-review/serialize";
import { blockNoteContent } from "@/lib/anchors/content";
import { htmlTextContent } from "@/lib/anchors/html-text";
import { resolveAnchor } from "@/lib/anchors/resolve";
import {
  CONTEXT,
  OUTDATED,
  type Anchor,
  type AnchorContent,
} from "@/lib/anchors/types";
import {
  blockNoteBlocksOf,
  blockNoteIdToNumber,
  displayBlocksOf,
} from "@/lib/blocknote/convert-blocks";
import { blocksToHtml } from "@/lib/strapi-blocks-html";
import type { Block, CustomBlockNoteBlock } from "@/types";
import {
  quizQuestionMarkdown,
  quizQuestionOf,
  type ChoiceQuestion,
} from "./quiz";
import { citedRefs } from "./refs";
import type {
  Citation,
  LessonContext,
  MentorDroplet,
  MentorLesson,
  Passage,
} from "./types";

/**
 * A lesson as Mentor reads it (ODY-882): prompt text it can cite, and where
 * each citation points. For the server and scripts only: the browser sends
 * ids, never lesson text (ODY-886), and a test keeps this module out of
 * client components.
 *
 * The text is the droplet's details, then the lesson's passages in page
 * order, separated by blank lines:
 *
 *   [p3] A paragraph, heading, list item, callout, table or code block
 *   [p4] [Quiz question] Which index suits range queries?
 *     - B-tree
 *     - Hash
 *   [Image: Index diagram]            (no ref: there's no text to point at)
 *   [Trimmed: the last 4 passages of this lesson are left out for length.]
 *
 * It comes from the lesson alone, never the request, so it can be cached.
 * Quiz answers and notebooks' hidden tests never reach it: passages are
 * built field by field from what the page shows, and the tests flip each
 * kind of answer to check that nothing in the output moves.
 *
 * Each passage has its block's index in displayBlocksOf(lesson), the blocks
 * the learner page draws in order. Each ref also has an anchor (lib/anchors),
 * checked before the ref is given out. Finding one on the learner page
 * (ODY-887):
 * - BlockNote paragraphs, headings and list items: the block id and its
 *   whole text. The page marks them with data-block-id.
 * - BlockNote callouts and tables: the same, but the page has no
 *   data-block-id on them: find the quote in the block.
 * - BlockNote code, quizzes, formulas, notebooks and sandboxes: the block id
 *   alone. Find the block by its index.
 * - Classic: a quote with up to 30 characters either side, in the lesson's
 *   text without answers (lessonAnchorContent). Its offsets are only a hint
 *   on the page: find the quote in the block, opening an expandable first.
 *   The page draws `$…$` as math and numbers code lines, so a quote with
 *   either may not be found as text.
 */

export const MENTOR_CONTEXT_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;
// A cut passage shorter than this isn't worth its tokens
const MIN_CUT = 200;
const LABEL_LENGTH = 80;
const CUT_NOTE = "[Trimmed: the rest of this passage is left out for length.]";

// Half of a surrogate pair, which slicing text can leave
const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
const wellFormed = (text: string) => text.replace(LONE_SURROGATE, "");
const noSpace = (text: string) => text.replace(/\s+/g, "");

// Parsed as htmlTextContent parses, so a piece's text is the text it counts
const PARSE_OPTIONS = {
  comment: false,
  blockTextElements: { script: false, noscript: false, style: true },
};
const TABLE = /<!--TABLE_START-->([\s\S]*?)<!--TABLE_END-->/;
const INLINE = new Set(
  "a abbr b bdi bdo br cite code data del dfn em i img ins kbd label mark math q s samp small span strong sub sup time u var wbr".split(
    " ",
  ),
);
// Opened to reach the block elements inside them
const WRAPPERS = new Set(
  "div section article main header footer aside".split(" "),
);
const MEDIA_TAGS = new Set(["img", "iframe", "video", "audio"]);
const MEDIA = [...MEDIA_TAGS].join(", ");
const QUIZ_TYPES = ["quiz-multiple-choice", "quiz-true-false"];

type CalloutBlock = Extract<Block, { __component: "droplets.callout" }>;
type CodeBlock = Extract<Block, { __component: "droplets.code-block" }> & {
  isNotebook?: boolean;
};
type SandpackBlock = Extract<Block, { __component: "droplets.sandpack-block" }>;
type OpenQuestion = Extract<
  Block,
  { __component: "droplets.open-ended-quiz" }
>["questions"][number];

/** A passage before refs are given out, with its anchor if it can be cited */
type Piece = { markdown: string; plain: string; anchor?: Anchor };
/** A piece, and the index of the block it's in */
type Placed = Piece & { blockIndex: number };

/**
 * Part of a Classic lesson's text without answers (its anchor text), and the
 * passage it holds, if any
 */
type Part = { text: string; passage?: Piece & { citable: boolean } };

const textOf = (html: string) => htmlTextContent(html)[0].text;
const tagOf = (node: Node) =>
  node instanceof HTMLElement ? node.rawTagName?.toLowerCase() ?? "" : "";
const htmlOf = (nodes: Node[]) => nodes.map(String).join("");
const parseHtml = (html: string) =>
  parse(html.replace(/\r\n?/g, "\n"), PARSE_OPTIONS);
const isList = (node: Node) => tagOf(node) === "ul" || tagOf(node) === "ol";
const blockIdOf = (node: Node) =>
  node instanceof HTMLElement ? node.getAttribute("data-block-id") : undefined;

/** The code fence open after a line of Markdown, given the one open before it */
function fenceAfter(open: string, line: string): string {
  const fence = /^\s*(`{3,})(.*)$/.exec(line);
  if (!fence) return open;
  if (!open) return fence[1];
  return fence[1].length >= open.length && !fence[2].trim() ? "" : open;
}

// ---------------------------------------------------------------------------
// Passages shared by both formats. Built from what the page shows, field by
// field: a quiz's answers and a notebook's tests are never read.
// ---------------------------------------------------------------------------

/**
 * Strapi rich text as the page draws it (blocksToHtml), with each nested
 * list moved into the item before it, where htmlToMarkdown looks for it
 */
function richTextHtml(content: CalloutBlock["content"]): string {
  const root = parseHtml(blocksToHtml(content as unknown as BlocksContent));
  for (const list of root.querySelectorAll("ul, ol")) {
    let item: HTMLElement | undefined;
    for (const child of [...list.childNodes]) {
      if (tagOf(child) === "li") item = child as HTMLElement;
      else if (item && isList(child)) {
        list.removeChild(child);
        item.appendChild(child);
      }
    }
  }
  return root.toString();
}

const calloutPiece = (block: CalloutBlock): Piece => {
  const html = richTextHtml(block.content);
  return {
    markdown: `[Callout, ${block.type || "info"}] ${htmlToMarkdown(html)}`,
    plain: textOf(html),
  };
};

const choicePiece = (question: ChoiceQuestion): Piece => ({
  markdown: quizQuestionMarkdown(quizQuestionOf(question)),
  plain: [
    question.content,
    ...(question.answerOptions ?? []).map((o) => o.content),
  ]
    .map((html) => textOf(html ?? "").trim())
    .join("\n"),
});

const openPiece = (question: OpenQuestion): Piece => ({
  markdown: `[Open-ended question] ${htmlToMarkdown(question.content)}`,
  plain: textOf(question.content ?? ""),
});

const videoPiece = (url: string | undefined): Piece => ({
  markdown: `[Video: ${url || "no URL"}]`,
  plain: "",
});

/** Code in a fence longer than any run of backticks in it, so the code can't close it */
function codePiece(block: CodeBlock): Piece {
  const code = block.code ?? "";
  const longest = Math.max(
    0,
    ...(code.match(/`+/g) ?? []).map((r) => r.length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  const modes = [block.editable && "editable", block.runnable && "runnable"];
  const label = [block.language, ...modes].filter(Boolean).join(", ");
  return {
    markdown: `[Code block${label ? `, ${label}` : ""}]\n${fence}${block.language ?? ""}\n${code}\n${fence}`,
    plain: code,
  };
}

function sandpackPiece(block: SandpackBlock): Piece {
  let files: string[] = [];
  try {
    files = Object.keys(JSON.parse(block.files) ?? {});
  } catch {
    // Unreadable files: the sandbox is still described
  }
  const lines = [
    `[Interactive code sandbox, ${block.template || "unknown"} template]`,
    block.description,
    `Files: ${files.join(", ") || "none"}`,
  ];
  return {
    markdown: lines.filter(Boolean).join("\n"),
    plain: block.description ?? "",
  };
}

/** A BlockNote table, from the JSON the page draws it from */
function tablePiece(json: string): Piece | null {
  let data: { markdown?: unknown; rows?: { cells?: { content?: string }[] }[] };
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const plain = (data?.rows ?? [])
    .flatMap((row) => row?.cells ?? [])
    .map((cell) => textOf(cell?.content ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return plain && typeof data?.markdown === "string"
    ? { markdown: data.markdown, plain }
    : null;
}

/** Each block element of some HTML, or run of inline content; wrappers are opened */
function htmlGroups(nodes: Node[]): Node[][] {
  const groups: Node[][] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length) groups.push(run);
    run = [];
  };
  const visit = (children: Node[]) => {
    for (const node of children) {
      const tag = tagOf(node);
      if (!(node instanceof HTMLElement) || INLINE.has(tag)) {
        run.push(node);
        continue;
      }
      flush();
      const hasBlocks = node.childNodes.some(
        (child) => child instanceof HTMLElement && !INLINE.has(tagOf(child)),
      );
      if (WRAPPERS.has(tag) && hasBlocks) {
        visit(node.childNodes);
        flush();
      } else {
        groups.push([node]);
      }
    }
  };
  visit(nodes);
  flush();
  return groups;
}

/**
 * A group's text, and its passage: text to cite, or media to mention. No
 * passage when the page shows nothing for it.
 */
function groupPart(nodes: Node[]): Part {
  const html = htmlOf(nodes);
  const text = textOf(html);
  if (text.trim()) {
    return {
      text,
      passage: { markdown: htmlToMarkdown(html), plain: text, citable: true },
    };
  }
  const media = nodes.some(
    (node) =>
      node instanceof HTMLElement &&
      (MEDIA_TAGS.has(tagOf(node)) || node.querySelector(MEDIA) !== null),
  );
  return media
    ? {
        text,
        passage: { markdown: htmlToMarkdown(html), plain: "", citable: false },
      }
    : { text };
}

// ---------------------------------------------------------------------------
// Classic lessons: anchored by quote in the lesson's text without answers
// ---------------------------------------------------------------------------

function htmlParts(html: string): Part[] {
  const table = TABLE.exec(html);
  const tableAt = table && tablePiece(table[1]);
  const parts: Part[] = tableAt
    ? [{ text: tableAt.plain, passage: { ...tableAt, citable: true } }]
    : [];
  const rest = table ? html.replace(TABLE, "") : html;
  return [...parts, ...htmlGroups(parseHtml(rest).childNodes).map(groupPart)];
}

/** A passage whose whole text is its quote */
const quoted = (piece: Piece): Part => ({
  text: piece.plain,
  passage: { ...piece, citable: true },
});

function classicParts(block: Block): Part[] {
  switch (block.__component) {
    case "droplets.generic":
      // A slide or column break is an HTML comment, which the parser drops
      return htmlParts(block.content ?? "");
    case "droplets.expandable": {
      const title = block.title ?? "";
      const markdown = `[Expandable section] ${title.trim()}`;
      return [
        title.trim()
          ? { text: title, passage: { markdown, plain: title, citable: true } }
          : { text: title },
        ...htmlParts(block.content ?? ""),
      ];
    }
    case "droplets.callout":
      return [quoted(calloutPiece(block))];
    case "droplets.quiz":
      // The question is the quote; its options follow it in the text
      return (block.questions ?? []).flatMap((question) => [
        {
          text: textOf(question.content ?? ""),
          passage: { ...choicePiece(question), citable: true },
        },
        {
          text: (question.answerOptions ?? [])
            .map((option) => textOf(option.content ?? ""))
            .join(""),
        },
      ]);
    case "droplets.open-ended-quiz":
      return (block.questions ?? []).map((q) => quoted(openPiece(q)));
    case "droplets.video":
      return [
        { text: "", passage: { ...videoPiece(block.url), citable: false } },
      ];
    case "droplets.code-block":
      return [quoted(codePiece(block))];
    case "droplets.sandpack-block":
      return [quoted(sandpackPiece(block))];
    default:
      return [];
  }
}

function classicPieces(blocks: Block[]): { pieces: Placed[]; text: string } {
  const parts = blocks.flatMap((block, blockIndex) =>
    classicParts(block).map((part) => ({ ...part, blockIndex })),
  );
  const text = parts.map((part) => part.text).join("");
  const pieces: Placed[] = [];
  let at = 0;
  for (const { text: partText, passage, blockIndex } of parts) {
    if (passage) {
      const { citable, ...piece } = passage;
      const quote = partText.trim();
      const start = at + partText.length - partText.trimStart().length;
      const end = start + quote.length;
      pieces.push({
        ...piece,
        blockIndex,
        anchor:
          citable && quote
            ? {
                v: 1,
                field: "blocks",
                start,
                end,
                quote,
                prefix: wellFormed(
                  text.slice(Math.max(0, start - CONTEXT), start),
                ),
                suffix: wellFormed(text.slice(end, end + CONTEXT)),
              }
            : undefined,
      });
    }
    at += partText.length;
  }
  return { pieces, text };
}

// ---------------------------------------------------------------------------
// BlockNote lessons: anchored by block id
// ---------------------------------------------------------------------------

/**
 * Finds the top-level block a converted block came from. Conversion ids a
 * block by its BlockNote id, or by its index when it has none (always, for
 * notebooks and sandboxes). The type is checked, and a match that isn't
 * unique counts as none.
 */
function sourceFinder(blocksV2: CustomBlockNoteBlock[]) {
  const byId = new Map<number, CustomBlockNoteBlock[]>();
  for (const block of blocksV2) {
    if (!block.id) continue;
    const id = blockNoteIdToNumber(block.id);
    byId.set(id, [...(byId.get(id) ?? []), block]);
  }
  return (id: number | undefined, types: string[]) => {
    if (id === undefined) return undefined;
    const found = new Set(
      [...(byId.get(id) ?? []), blocksV2[id]].filter(
        (block) => block !== undefined && types.includes(block.type),
      ),
    );
    return found.size === 1 ? [...found][0].id || undefined : undefined;
  };
}

/** Text and media outside any BlockNote block, which can't be cited */
const loosePieces = (nodes: Node[]): Piece[] =>
  htmlGroups(nodes).flatMap((group) => {
    const { passage } = groupPart(group);
    return passage
      ? [{ markdown: passage.markdown, plain: passage.plain }]
      : [];
  });

/**
 * A converted block's HTML, one passage per element marked with a BlockNote
 * block id. A list item is its own text, without the items under it.
 */
function blockIdPieces(
  nodes: Node[],
  anchorOf: (blockId: string | undefined) => Anchor | undefined,
): Piece[] {
  const pieces: Piece[] = [];
  const add = (html: string, blockId: string | undefined, lead = "") => {
    const plain = textOf(html);
    if (!plain.trim()) return;
    const markdown = htmlToMarkdown(html).replace(
      /\n/g,
      `\n${" ".repeat(lead.length)}`,
    );
    pieces.push({
      markdown: lead + markdown,
      plain,
      anchor: anchorOf(blockId),
    });
  };
  const list = (element: HTMLElement, depth: number) => {
    const items = element.childNodes.filter((n) => tagOf(n) === "li");
    items.forEach((item, i) => {
      const under = (n: Node) => isList(n) || blockIdOf(n) !== undefined;
      const marker = tagOf(element) === "ol" ? `${i + 1}.` : "-";
      add(
        htmlOf(item.childNodes.filter((n) => !under(n))),
        blockIdOf(item),
        `${"  ".repeat(depth)}${marker} `,
      );
      for (const child of item.childNodes.filter(under)) {
        if (isList(child)) list(child as HTMLElement, depth + 1);
        else add(child.toString(), blockIdOf(child), "  ".repeat(depth + 1));
      }
    });
  };
  const visit = (children: Node[]) => {
    let run: Node[] = [];
    const flush = () => {
      pieces.push(...loosePieces(run));
      run = [];
    };
    for (const node of children) {
      const marked =
        node instanceof HTMLElement &&
        (blockIdOf(node) !== undefined ||
          node.querySelector("[data-block-id]") !== null);
      if (!marked) {
        if (INLINE.has(tagOf(node)) || !(node instanceof HTMLElement)) {
          run.push(node);
        } else {
          flush();
          pieces.push(...loosePieces([node]));
        }
        continue;
      }
      flush();
      if (isList(node)) list(node as HTMLElement, 0);
      else if (blockIdOf(node) !== undefined)
        add(node.toString(), blockIdOf(node));
      else visit((node as HTMLElement).childNodes);
    }
    flush();
  };
  visit(nodes);
  return pieces;
}

function blockNotePieces(
  blocks: Block[],
  blocksV2: CustomBlockNoteBlock[],
): Placed[] {
  const texts = new Map<string, string>();
  const repeated = new Set<string>();
  for (const { id, text } of blockNoteContent(blocksV2)) {
    if (!id) continue;
    if (texts.has(id)) repeated.add(id);
    else texts.set(id, text);
  }
  // The block's whole text, or the block itself when it saves none. An id
  // two blocks share could point at either, so it gets no anchor.
  const anchorOf = (blockId: string | undefined): Anchor | undefined => {
    if (blockId === undefined || repeated.has(blockId)) return undefined;
    const quote = texts.get(blockId);
    if (quote === undefined) return undefined;
    return quote
      ? { v: 1, field: "blocks", blockId, start: 0, end: quote.length, quote }
      : { v: 1, field: "blocks", blockId };
  };
  const sourceOf = sourceFinder(blocksV2);
  const from = (piece: Piece, id: number | undefined, types: string[]) => ({
    ...piece,
    anchor: anchorOf(sourceOf(id, types)),
  });

  const piecesOf = (block: Block): Piece[] => {
    switch (block.__component) {
      case "droplets.generic": {
        const content = block.content ?? "";
        const table = TABLE.exec(content);
        if (table) {
          const piece = tablePiece(table[1]);
          return [
            ...(piece ? [from(piece, block.id, ["table"])] : []),
            ...loosePieces(parseHtml(content.replace(TABLE, "")).childNodes),
          ];
        }
        const root = parseHtml(content);
        if (root.querySelector("[data-block-id]")) {
          return blockIdPieces(root.childNodes, anchorOf);
        }
        const formula = sourceOf(block.id, ["latex"]);
        if (formula) {
          const tex = blocksV2.find((b) => b.id === formula)?.props?.content;
          return [
            {
              markdown: htmlToMarkdown(content),
              plain: String(tex ?? ""),
              anchor: anchorOf(formula),
            },
          ];
        }
        return loosePieces(root.childNodes);
      }
      case "droplets.callout":
        return [from(calloutPiece(block), block.id, ["callout"])];
      case "droplets.quiz":
        return (block.questions ?? []).map((question) =>
          from(choicePiece(question), question.id, QUIZ_TYPES),
        );
      case "droplets.open-ended-quiz":
        return (block.questions ?? []).map((question) =>
          from(openPiece(question), question.id, ["quiz-open-ended"]),
        );
      case "droplets.video":
        return [videoPiece(block.url)];
      case "droplets.code-block": {
        const code = block as CodeBlock;
        const type = code.isNotebook ? "notebook-code" : "code-block";
        return [from(codePiece(code), block.id, [type])];
      }
      case "droplets.sandpack-block":
        return [from(sandpackPiece(block), block.id, ["sandpack-block"])];
      default:
        return [];
    }
  };
  return blocks.flatMap((block, blockIndex) =>
    piecesOf(block).map((piece) => ({ ...piece, blockIndex })),
  );
}

// ---------------------------------------------------------------------------
// The context
// ---------------------------------------------------------------------------

/**
 * The text a lesson's anchors resolve against: each BlockNote block's own
 * text, or a Classic lesson's text without its answers
 */
export function lessonAnchorContent(lesson: MentorLesson): AnchorContent {
  const blocksV2 = blockNoteBlocksOf(lesson);
  return {
    blocks: blocksV2
      ? blockNoteContent(blocksV2)
      : [{ text: classicPieces(displayBlocksOf(lesson)).text }],
  };
}

/**
 * Whether a ref can be given out: its anchor resolves exactly where it says,
 * and its quote is in the passage's own text (whitespace aside: a table's
 * cells are spaced in one and not the other)
 */
function trusted(
  content: AnchorContent,
  anchor: Anchor,
  plain: string,
): boolean {
  const range = resolveAnchor(content, anchor);
  return (
    range !== OUTDATED &&
    range.exact &&
    range.blockId === anchor.blockId &&
    (anchor.start === undefined ||
      (range.start === anchor.start && range.end === anchor.end)) &&
    (!anchor.quote || noSpace(plain).includes(noSpace(anchor.quote)))
  );
}

/** A passage's lines without blank ones, outside code: blank lines separate passages */
function compact(markdown: string): string {
  let open = "";
  return markdown
    .split("\n")
    .filter((line) => {
      const inCode = open !== "";
      open = fenceAfter(open, line);
      return inCode || open !== "" || line.trim() !== "";
    })
    .join("\n");
}

function header(droplet: MentorDroplet, lesson: MentorLesson): string {
  const objectives = droplet.learningObjectives.length
    ? droplet.learningObjectives.map((objective) => `- ${objective}`)
    : ["- (none listed)"];
  return [
    `Droplet: ${droplet.name}`,
    droplet.difficulty && `Difficulty: ${droplet.difficulty}`,
    "Learning objectives:",
    ...objectives,
    `Lesson: ${lesson.name}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const trimmedNote = (count: number) =>
  count === 1
    ? "[Trimmed: the last passage of this lesson is left out for length.]"
    : `[Trimmed: the last ${count} passages of this lesson are left out for length.]`;

/** A passage cut to `room` characters, "…" included, closing any code fence it leaves open */
function cutTo(line: string, room: number): string {
  const cut = (length: number) =>
    `${wellFormed(line.slice(0, length)).trimEnd()}…`;
  const openIn = (text: string) => text.split("\n").reduce(fenceAfter, "");
  const whole = cut(room - 1);
  const fence = openIn(whole);
  if (!fence) return whole;
  // Room for a line that closes the fence
  const shorter = cut(room - 2 - fence.length);
  const open = openIn(shorter);
  return open ? `${shorter}\n${open}` : shorter;
}

/**
 * Passages in order while they fit. The one that crosses the budget is cut
 * to fit when enough of it does, and the rest are left out, each with a
 * note, so refs never change meaning.
 */
function fit(
  head: string,
  lines: string[],
  maxChars: number,
): { text: string; kept: number; cut: boolean } {
  let text = head;
  for (let i = 0; i < lines.length; i++) {
    const after = lines.length - i - 1;
    const note = after ? `\n\n${trimmedNote(after)}` : "";
    const whole = `${text}\n\n${lines[i]}`;
    if (whole.length + note.length <= maxChars) {
      text = whole;
      continue;
    }
    const tail = `\n\n${after ? trimmedNote(after) : CUT_NOTE}`;
    const room = maxChars - text.length - 2 - tail.length;
    if (room >= MIN_CUT) {
      const cut = `${text}\n\n${cutTo(lines[i], room)}${tail}`;
      return { text: cut, kept: i + 1, cut: true };
    }
    const left = `${text}\n\n${trimmedNote(lines.length - i)}`;
    return { text: left, kept: i, cut: false };
  }
  return { text, kept: lines.length, cut: false };
}

/** A lesson as prompt text with refs, trimmed to the budget (about 8,000 tokens) */
export function buildLessonContext(
  lesson: MentorLesson,
  droplet: MentorDroplet,
  options: { maxTokens?: number } = {},
): LessonContext {
  const blocksV2 = blockNoteBlocksOf(lesson);
  const blocks = displayBlocksOf(lesson);
  let pieces: Placed[];
  let content: AnchorContent;
  if (blocksV2) {
    pieces = blockNotePieces(blocks, blocksV2);
    content = { blocks: blockNoteContent(blocksV2) };
  } else {
    const classic = classicPieces(blocks);
    pieces = classic.pieces;
    content = { blocks: [{ text: classic.text }] };
  }

  let count = 0;
  const passages: Passage[] = pieces.flatMap((piece) => {
    // Leading spaces are a nested list item's indent
    const markdown = compact(piece.markdown).trimEnd();
    if (!markdown.trim()) return [];
    const plain = piece.plain.trim();
    const anchor =
      piece.anchor && trusted(content, piece.anchor, plain)
        ? piece.anchor
        : null;
    return [
      {
        ref: anchor ? `p${++count}` : null,
        markdown,
        plain,
        anchor,
        blockIndex: piece.blockIndex,
        inPrompt: true,
      },
    ];
  });

  // A ref before a code fence goes on its own line, so the fence starts one
  const line = ({ ref, markdown }: Passage) =>
    !ref
      ? markdown
      : `[${ref}]${/^\s*`{3,}/.test(markdown) ? "\n" : " "}${markdown}`;
  const maxTokens = options.maxTokens ?? MENTOR_CONTEXT_TOKENS;
  const { text, kept, cut } = fit(
    header(droplet, lesson),
    passages.map(line),
    maxTokens * CHARS_PER_TOKEN,
  );
  passages.forEach((passage, i) => {
    passage.inPrompt = i < kept;
  });

  return {
    lessonId: lesson.id,
    format: blocksV2 ? "blocknote" : "classic",
    text,
    tokens: Math.ceil(text.length / CHARS_PER_TOKEN),
    passages,
    omitted: passages.length - kept,
    trimmed: cut || kept < passages.length,
  };
}

/** A passage's first words, for the Sources line: its text without Markdown marks */
function labelOf({ markdown, plain }: Passage): string {
  const fromMarkdown = markdown
    .replace(/^\[[^\]\n]*\](?!\()\s*/, "")
    .split("\n")
    .filter(
      (line) =>
        !/^[\s|:-]*-{3,}[\s|:-]*$/.test(line) &&
        !/^\s*\[[^\]]*\]\s*$/.test(line),
    )
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.|#{1,6})\s+/, ""))
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|[*`]/g, "")
    .replace(/\|/g, " ");
  // Code reads better as itself
  const text = /^\s*`{3,}/m.test(markdown) ? plain : fromMarkdown;
  const flat = (text.trim() ? text : plain).replace(/\s+/g, " ").trim();
  if (flat.length <= LABEL_LENGTH) return flat;
  const cut = flat.slice(0, LABEL_LENGTH);
  const space = cut.lastIndexOf(" ");
  const words = space > LABEL_LENGTH / 2 ? cut.slice(0, space) : cut;
  return `${wellFormed(words).trimEnd()}…`;
}

/** The passages an answer cites, in the order cited; refs that weren't in the prompt are dropped */
export function citationsFor(
  context: LessonContext,
  answer: string,
): Citation[] {
  const cited = new Map(
    context.passages
      .filter((p) => p.ref && p.anchor && p.inPrompt)
      .map((p) => [p.ref!, p]),
  );
  return citedRefs(answer).flatMap((ref) => {
    const passage = cited.get(ref);
    return passage
      ? [
          {
            ref,
            anchor: passage.anchor!,
            blockIndex: passage.blockIndex,
            label: labelOf(passage),
          },
        ]
      : [];
  });
}

/**
 * The refs of every passage a selection appears in, in page order, ignoring
 * whitespace (a browser's selection breaks lines where the saved text
 * doesn't). [] when it's only in passages that can't be cited; null when it
 * isn't in the lesson. Passages the budget left out count. Answers aren't
 * lesson text.
 */
export function locateSelection(
  context: LessonContext,
  selection: string,
): string[] | null {
  const wanted = noSpace(selection);
  if (!wanted) return null;
  let joined = "";
  const spans: { ref: string | null; start: number; end: number }[] = [];
  for (const { ref, plain } of context.passages) {
    const text = noSpace(plain);
    spans.push({ ref, start: joined.length, end: joined.length + text.length });
    joined += text;
  }
  let found = false;
  const refs: string[] = [];
  for (
    let at = joined.indexOf(wanted);
    at !== -1;
    at = joined.indexOf(wanted, at + 1)
  ) {
    found = true;
    const end = at + wanted.length;
    for (const { ref, start, end: spanEnd } of spans) {
      if (ref && start < end && spanEnd > at && !refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }
  return found ? refs : null;
}
