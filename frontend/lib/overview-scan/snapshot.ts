import { parse, HTMLElement, type Node } from "node-html-parser";
import type {
  Block,
  CustomBlockNoteBlock,
  Dataset,
  Droplet,
  LearningObjective,
  Lesson,
  Resource,
  Tag,
} from "@/types";
import type {
  LinkedDroplet,
  ScanBlock,
  ScanDocument,
  ScanLink,
  ScanPart,
} from "@/lib/overview-scan/types";

/**
 * The scan's snapshot (ODY-790): the droplet page and every lesson as one
 * ScanDocument of plain-text blocks, read from either editor's format. No
 * Strapi calls: the caller reads the droplet and its lessons fresh.
 */

type Linked = Pick<Droplet, "id" | "name" | "status" | "isHidden">;

/** The droplet fields the snapshot reads, so a query knows what to populate. */
export type ScanSourceDroplet = Pick<
  Droplet,
  | "id"
  | "name"
  | "overview"
  | "description"
  | "difficulty"
  | "originalDropletId"
  | "funFact"
> & {
  learningObjectives?: Pick<LearningObjective, "objective">[] | null;
  tags?: Pick<Tag, "name">[] | null;
  prerequisites?: Linked[] | null;
  postrequisites?: Linked[] | null;
  nextSteps?: Pick<Resource, "label" | "url">[] | null;
  datasets?:
    | (Pick<Dataset, "name" | "fileUrl"> & { rowCount?: number | null })[]
    | null;
};

export type ScanSourceLesson = Pick<Lesson, "id" | "name" | "blocksVersion"> & {
  blocks?: Block[] | null;
  blocksV2?: CustomBlockNoteBlock[] | null;
};

/** `lessons` must be in the order a learner takes them. */
export function buildScanDocument(
  droplet: ScanSourceDroplet,
  lessons: readonly ScanSourceLesson[],
): ScanDocument {
  return {
    droplet: {
      id: droplet.id,
      originalDropletId: droplet.originalDropletId ?? null,
      name: plain(droplet.name),
      overview: htmlText(droplet.overview),
      description: plain(droplet.description),
      learningObjectives: (droplet.learningObjectives ?? []).map((o) =>
        plain(o.objective),
      ),
      difficulty: droplet.difficulty ?? null,
      tags: (droplet.tags ?? []).map((t) => plain(t.name)),
      prerequisites: (droplet.prerequisites ?? []).map(linked),
      postrequisites: (droplet.postrequisites ?? []).map(linked),
      funFact: plain(droplet.funFact),
      nextSteps: (droplet.nextSteps ?? []).map((s) => ({
        label: plain(s.label),
        url: str(s.url).trim(),
      })),
      datasets: (droplet.datasets ?? []).map((d) => ({
        name: plain(d.name),
        fileUrl: str(d.fileUrl).trim(),
        rowCount: d.rowCount ?? null,
      })),
    },
    parts: [
      {
        id: "droplet",
        kind: "droplet",
        title: "Droplet page",
        blocks: htmlBlocks(droplet.overview, "overview"),
      },
      ...lessons.map(
        (lesson, i): ScanPart => ({
          id: String(lesson.id),
          kind: "lesson",
          title: `Lesson ${i + 1} · ${plain(lesson.name)}`,
          blocks:
            lesson.blocksVersion === "v2"
              ? blockNoteBlocks(lesson.blocksV2 ?? [])
              : legacyBlocks(lesson.blocks ?? []),
        }),
      ),
    ],
  };
}

const linked = (d: Linked): LinkedDroplet => ({
  id: d.id,
  name: plain(d.name),
  status: d.status,
  isHidden: d.isHidden === true,
});

const str = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const plain = (value: unknown): string =>
  str(value).replace(/\s+/g, " ").trim();

const withLinks = (block: ScanBlock, links: readonly ScanLink[]): ScanBlock =>
  links.length ? { ...block, links } : block;

// ---- BlockNote (blocksV2) ----

const LIST_ITEMS = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
]);

type ListItem = {
  type: "list-item";
  id: string;
  text: string;
  links: ScanLink[];
};

/** Every block in document order, with indented children after their parent. */
const flatten = (
  blocks: readonly CustomBlockNoteBlock[],
): CustomBlockNoteBlock[] =>
  blocks.flatMap((b) => [b, ...flatten(b.children ?? [])]);

function blockNoteBlocks(blocks: readonly CustomBlockNoteBlock[]): ScanBlock[] {
  // Consecutive list items, nested ones included, become one list block
  const out: ScanBlock[] = [];
  let list: ListItem[] = [];
  const closeList = () => {
    if (list.length)
      out.push(
        withLinks(
          { id: list[0].id, type: "list", items: list.map((i) => i.text) },
          list.flatMap((i) => i.links),
        ),
      );
    list = [];
  };
  for (const block of flatten(blocks)) {
    const scanned = blockNoteBlock(block);
    if (scanned?.type === "list-item") {
      if (scanned.text) list.push(scanned);
      continue;
    }
    closeList();
    if (scanned) out.push(scanned);
  }
  closeList();
  return out;
}

function blockNoteBlock(
  block: CustomBlockNoteBlock,
): ScanBlock | ListItem | null {
  const { id } = block;
  const p = block.props ?? {};
  switch (block.type) {
    case "paragraph":
    case "quote":
    case "heading":
    case "callout": {
      const { text, links } = richText(block.content);
      if (!text && !links.length) return null;
      if (block.type === "heading")
        return withLinks(
          { id, type: "heading", level: Number(p.level) || 1, text },
          links,
        );
      const type = block.type === "callout" ? "callout" : "paragraph";
      return withLinks({ id, type, text }, links);
    }
    case "image":
      return {
        id,
        type: "image",
        url: str(p.url).trim(),
        caption: plain(p.caption),
      };
    case "video":
      return { id, type: "video", url: str(p.url).trim() };
    case "table": {
      const links: ScanLink[] = [];
      const rows = tableRows(block.content).map((cells) =>
        cells.map((cell) => {
          // A cell is its inline content, or { type: "tableCell", content }
          const r = richText(Array.isArray(cell) ? cell : cell?.content);
          links.push(...r.links);
          return r.text;
        }),
      );
      return rows.length ? withLinks({ id, type: "table", rows }, links) : null;
    }
    case "quiz-multiple-choice":
      return {
        id,
        type: "quiz-mc",
        question: plain(p.question),
        options: quizOptions(p.options),
      };
    case "quiz-true-false":
      return {
        id,
        type: "quiz-tf",
        question: plain(p.question),
        correctAnswer: p.correctAnswer === true || p.correctAnswer === "true",
      };
    case "quiz-open-ended":
      return {
        id,
        type: "quiz-open",
        question: plain(p.question),
        correctAnswer: plain(p.correctAnswer),
      };
    case "code-block":
    case "notebook-code": {
      const notebook = block.type === "notebook-code";
      return {
        id,
        type: "code",
        variant: notebook ? "notebook" : "code",
        language: str(p.language).trim() || null,
        code: str(p.code),
        runnable: notebook || p.runnable === true || p.runnable === "true",
      };
    }
    case "sandpack-block":
      return {
        id,
        type: "sandpack",
        template: str(p.template),
        files: sandpackFiles(p.files),
      };
    default:
      if (LIST_ITEMS.has(block.type)) {
        const { text, links } = richText(block.content);
        return { type: "list-item", id, text, links };
      }
      // LaTeX, slide and column breaks, dividers, files and audio: nothing
      // any rule reads
      return null;
  }
}

type RichNode = {
  type?: string;
  text?: unknown;
  href?: unknown;
  url?: unknown;
  content?: unknown;
  children?: unknown;
};

/**
 * Text and links from BlockNote inline content, or from the Strapi rich-text
 * blocks a legacy callout holds. BlockNote nests a link's text in `content`
 * and Strapi in `children`.
 */
function richText(nodes: unknown): { text: string; links: ScanLink[] } {
  const links: ScanLink[] = [];
  const raw = (list: unknown): string =>
    (Array.isArray(list) ? (list as RichNode[]) : [])
      .map((n) => {
        const inner = n?.content ?? n?.children;
        if (n?.type === "link") {
          const text = raw(inner);
          links.push({ text: plain(text), url: str(n.href ?? n.url).trim() });
          return text;
        }
        return inner ? `${raw(inner)} ` : str(n?.text);
      })
      .join("");
  return { text: plain(raw(nodes)), links };
}

function tableRows(content: unknown): { content?: unknown }[][] {
  const rows = (content as { rows?: { cells?: unknown[] }[] } | undefined)
    ?.rows;
  return (Array.isArray(rows) ? rows : []).map(
    (row) => (row?.cells ?? []) as { content?: unknown }[],
  );
}

/** Options are an array, or the JSON string of one. */
function quizOptions(options: unknown) {
  let list = options;
  if (typeof options === "string") {
    try {
      list = JSON.parse(options);
    } catch {
      list = [];
    }
  }
  return (Array.isArray(list) ? list : []).map(
    (o: { text?: unknown; isCorrect?: unknown }) => ({
      text: plain(o?.text),
      isCorrect: o?.isCorrect === true,
    }),
  );
}

/** Sandpack keeps its files as a JSON string of { path: code }. */
function sandpackFiles(files: unknown): Record<string, string> {
  try {
    const parsed: unknown =
      typeof files === "string" ? JSON.parse(files || "{}") : files;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([path, file]) => [
        path,
        typeof file === "string"
          ? file
          : str((file as { code?: unknown })?.code),
      ]),
    );
  } catch {
    return {};
  }
}

// ---- Legacy blocks (v1) ----

function legacyBlocks(blocks: readonly Block[]): ScanBlock[] {
  return blocks.flatMap((block, i): ScanBlock[] => {
    const id = String(block.id ?? `block-${i + 1}`);
    switch (block.__component) {
      case "droplets.generic":
        return htmlBlocks(block.content, id);
      case "droplets.expandable": {
        const title = plain(block.title);
        return [
          ...(title ? [{ id, type: "paragraph" as const, text: title }] : []),
          ...htmlBlocks(block.content, id),
        ];
      }
      case "droplets.callout": {
        const { text, links } = richText(block.content);
        return text || links.length
          ? [withLinks({ id, type: "callout", text }, links)]
          : [];
      }
      case "droplets.video":
        return [{ id, type: "video", url: str(block.url).trim() }];
      case "droplets.quiz":
        return (block.questions ?? []).map(
          (q): ScanBlock => ({
            id,
            type: "quiz-mc",
            question: htmlText(q.content),
            options: (q.answerOptions ?? []).map((o) => ({
              text: plain(o.content),
              isCorrect: o.isCorrect === true,
            })),
          }),
        );
      case "droplets.open-ended-quiz":
        return (block.questions ?? []).map(
          (q): ScanBlock => ({
            id,
            type: "quiz-open",
            question: htmlText(q.content),
            correctAnswer: plain(q.correctAnswer),
          }),
        );
      default:
        // Code and Sandpack blocks only exist in BlockNote, which is read above
        return [];
    }
  });
}

// Parse a <pre>'s inside too: by default the parser keeps it as raw text
const HTML_OPTIONS = {
  comment: false,
  blockTextElements: { script: true, noscript: true, style: true },
};

const INLINE_TAGS = new Set(
  "A ABBR B BR CITE CODE DEL EM FONT I INS KBD MARK Q S SMALL SPAN STRONG SUB SUP U".split(
    " ",
  ),
);

const SKIPPED_TAGS = new Set([
  "FIGCAPTION", // a screen reader reads the alt, which is the image's caption
  "HR",
  "NOSCRIPT",
  "SCRIPT",
  "STYLE",
]);

const htmlText = (html: string | null | undefined): string =>
  html ? plain(parse(html, HTML_OPTIONS).structuredText) : "";

const isElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement;

/** CKEditor HTML as blocks, every one with the same id. */
function htmlBlocks(html: string | null | undefined, id: string): ScanBlock[] {
  if (!html) return [];
  const out: ScanBlock[] = [];
  let loose: Node[] = []; // text and inline tags between block tags

  const linksIn = (nodes: Node[]): ScanLink[] =>
    nodes
      .filter(isElement)
      .flatMap((el) => [
        ...(el.tagName === "A" ? [el] : []),
        ...el.querySelectorAll("a"),
      ])
      .filter((a) => a.hasAttribute("href"))
      .map((a) => ({
        text: plain(a.structuredText),
        url: str(a.getAttribute("href")).trim(),
      }));

  // Images among the nodes or inside them, e.g. <p><img></p> or <a><img></a>
  const imagesIn = (nodes: Node[]): ScanBlock[] =>
    nodes
      .filter(isElement)
      .flatMap((el) => [
        ...(el.tagName === "IMG" ? [el] : []),
        ...el.querySelectorAll("img"),
      ])
      .map((img) => image(img));

  const image = (img: HTMLElement): ScanBlock => ({
    id,
    type: "image",
    url: str(img.getAttribute("src")).trim(),
    caption: plain(img.getAttribute("alt")),
  });

  const textBlock = (
    nodes: Node[],
    make: (text: string) => ScanBlock,
  ): void => {
    const text = plain(nodes.map((n) => n.text).join(""));
    const links = linksIn(nodes);
    if (text || links.length) out.push(withLinks(make(text), links));
    out.push(...imagesIn(nodes));
  };

  const flush = () => {
    textBlock(loose, (text) => ({ id, type: "paragraph", text }));
    loose = [];
  };

  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (!isElement(node) || INLINE_TAGS.has(node.tagName)) {
        loose.push(node);
        continue;
      }
      flush();
      const tag = node.tagName;
      if (SKIPPED_TAGS.has(tag)) continue;
      if (/^H[1-6]$/.test(tag)) {
        textBlock([node], (text) => ({
          id,
          type: "heading",
          level: Number(tag[1]),
          text,
        }));
      } else if (tag === "P" || tag === "BLOCKQUOTE") {
        textBlock(node.childNodes, (text) => ({ id, type: "paragraph", text }));
      } else if (tag === "UL" || tag === "OL") {
        const items = listItems(node).filter(Boolean);
        if (items.length)
          out.push(withLinks({ id, type: "list", items }, linksIn([node])));
        out.push(...imagesIn([node]));
      } else if (tag === "PRE") {
        const code = node.querySelector("code") ?? node;
        const language = /(?:^|\s)language-(\S+)/.exec(
          code.getAttribute("class") ?? "",
        );
        out.push({
          id,
          type: "code",
          variant: "code",
          language: language?.[1] ?? null,
          code: code.text,
          runnable: false,
        });
      } else if (tag === "TABLE") {
        const rows = node
          .querySelectorAll("tr")
          .map((tr) =>
            tr.querySelectorAll("th, td").map((c) => plain(c.structuredText)),
          );
        out.push(withLinks({ id, type: "table", rows }, linksIn([node])));
        out.push(...imagesIn([node]));
      } else if (tag === "IMG") {
        out.push(image(node));
      } else if (tag === "OEMBED" || tag === "IFRAME" || tag === "VIDEO") {
        // CKEditor's media embed is <oembed url>; older content uses <iframe>
        const url =
          node.getAttribute("url") ??
          node.getAttribute("src") ??
          node.querySelector("source")?.getAttribute("src");
        out.push({ id, type: "video", url: str(url).trim() });
      } else {
        walk(node.childNodes); // <div>, <figure>, <section>, …
      }
    }
  };

  walk(parse(html, HTML_OPTIONS).childNodes);
  flush();
  return out;
}

/** Each <li>'s own text, then its nested list's items. */
function listItems(list: HTMLElement): string[] {
  return list.childNodes
    .filter((n): n is HTMLElement => isElement(n) && n.tagName === "LI")
    .flatMap((li) => {
      const nested = li.childNodes.filter(
        (n): n is HTMLElement =>
          isElement(n) && (n.tagName === "UL" || n.tagName === "OL"),
      );
      const own = li.childNodes.filter(
        (n) => !nested.includes(n as HTMLElement),
      );
      return [
        plain(own.map((n) => n.text).join("")),
        ...nested.flatMap(listItems),
      ];
    });
}
