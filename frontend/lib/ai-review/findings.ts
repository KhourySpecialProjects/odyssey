import type { AiFinding } from "@/types";
import { aiFindingSchema } from "@/lib/validations/review";
import { classicLessonHtml } from "@/lib/review-classic";
import { OVERVIEW_TEXT_FIELDS, overviewFieldHtml } from "@/lib/review-overview";
import { blockNoteContent } from "@/lib/anchors/content";
import { htmlTextContent } from "@/lib/anchors/html-text";
import { resolveAnchor } from "@/lib/anchors/resolve";
import {
  CONTEXT,
  type Anchor,
  type AnchorBlock,
  type AnchorContent,
} from "@/lib/anchors/types";
import type { DropletSnapshot, Transgression } from "./types";

const MAX_FINDINGS = 5;
const MAX_REASON = 500;
const MAX_ANCHOR_JSON = 3000;
const MIN_QUOTE_CHARS = 3;
// A half of a surrogate pair: Postgres jsonb rejects it
const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
const wellFormed = (text: string) => text.replace(LONE_SURROGATE, "");

/** The text a lesson's or the Overview's anchors resolve against. */
export type FindingTexts = {
  lessons: Map<number, AnchorContent>;
  overview: AnchorContent;
  lessonOrder: number[];
};

/** The same text the review panel draws, built without a browser DOM. */
export function findingTexts(snapshot: DropletSnapshot): FindingTexts {
  const lessons = new Map<number, AnchorContent>();
  for (const lesson of snapshot.lessons) {
    const blocks =
      lesson.blocksVersion === "v2"
        ? blockNoteContent(lesson.blocksV2 ?? [])
        : htmlTextContent(classicLessonHtml(lesson.blocks ?? []));
    lessons.set(lesson.id, { blocks });
  }
  const { droplet } = snapshot;
  const html = overviewFieldHtml({
    name: droplet.name,
    description: droplet.description,
    overview: droplet.overview,
    objectives: droplet.learningObjectives,
  });
  const overview = Object.fromEntries(
    OVERVIEW_TEXT_FIELDS.map((f) => [f, htmlTextContent(html[f])]),
  );
  return { lessons, overview, lessonOrder: snapshot.lessons.map((l) => l.id) };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Where the quote is in a block: as written, else without the model's Markdown. */
function locate(text: string, raw: string): [number, number] | null {
  const quote = raw.trim();
  if (quote.replace(/\s/g, "").length < MIN_QUOTE_CHARS) return null;
  const exact = text.indexOf(quote);
  if (exact !== -1) return [exact, exact + quote.length];

  const plain = quote
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|~~|`/g, "")
    .trim();
  if (!plain) return null;
  const pattern = plain.split(/\s+/).map(escapeRegExp).join("\\s+");
  const found = new RegExp(pattern).exec(text);
  return found ? [found.index, found.index + found[0].length] : null;
}

/** Which content a quote may come from, and the lesson it belongs to. */
function searchScope(
  t: Transgression,
  scope: { lessonId: number } | "overall",
  texts: FindingTexts,
): {
  content: AnchorContent;
  fields: string[];
  lessonId: number | null;
} | null {
  if (scope !== "overall") {
    const content = texts.lessons.get(scope.lessonId);
    return content
      ? { content, fields: ["blocks"], lessonId: scope.lessonId }
      : null;
  }
  if (t.lesson === 0) {
    return {
      content: texts.overview,
      fields: [...OVERVIEW_TEXT_FIELDS],
      lessonId: null,
    };
  }
  const lessonId =
    t.lesson === undefined ? undefined : texts.lessonOrder[t.lesson - 1];
  const content =
    lessonId === undefined ? undefined : texts.lessons.get(lessonId);
  return content ? { content, fields: ["blocks"], lessonId: lessonId! } : null;
}

function buildAnchor(
  content: AnchorContent,
  fields: string[],
  quote: string,
): Anchor | null {
  for (const field of fields) {
    for (const block of content[field] ?? ([] as AnchorBlock[])) {
      const at = locate(block.text, quote);
      if (!at) continue;
      const [start, end] = at;
      return {
        v: 1,
        field,
        ...(block.id !== undefined && { blockId: block.id }),
        start,
        end,
        quote: block.text.slice(start, end),
        prefix: wellFormed(
          block.text.slice(Math.max(0, start - CONTEXT), start),
        ),
        suffix: wellFormed(block.text.slice(end, end + CONTEXT)),
      };
    }
  }
  return null;
}

/**
 * Turns a score's transgressions into findings, keeping only quotes that
 * resolve exactly in the allowed text. `dropped` counts the rest.
 */
export function toFindings(
  transgressions: Transgression[],
  scope: { lessonId: number } | "overall",
  texts: FindingTexts,
  nextId: () => string,
): { findings: AiFinding[]; dropped: number } {
  const findings: AiFinding[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const t of transgressions) {
    const where = searchScope(t, scope, texts);
    const anchor = where && buildAnchor(where.content, where.fields, t.quote);
    const reason = wellFormed(t.reason.trim().slice(0, MAX_REASON)).trim();
    const key =
      anchor &&
      `${anchor.field}:${anchor.blockId}:${anchor.start}:${anchor.end}`;
    if (
      !where ||
      !anchor ||
      !reason ||
      seen.has(key!) ||
      JSON.stringify(anchor).length > MAX_ANCHOR_JSON ||
      wellFormed(anchor.quote!) !== anchor.quote ||
      findings.length >= MAX_FINDINGS
    ) {
      dropped++;
      continue;
    }
    const resolved = resolveAnchor(where.content, anchor);
    const candidate = {
      id: "pending",
      quote: anchor.quote!,
      reason,
      lessonId: where.lessonId,
      anchor,
    };
    if (
      resolved === "outdated" ||
      !resolved.exact ||
      !aiFindingSchema.safeParse(candidate).success
    ) {
      dropped++;
      continue;
    }
    seen.add(key!);
    findings.push({ ...candidate, id: nextId() } as AiFinding);
  }
  return { findings, dropped };
}
