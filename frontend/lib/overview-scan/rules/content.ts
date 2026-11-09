import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { CONFIG } from "@/lib/overview-scan/config";
import { blockText, dropletPart, lessonParts } from "@/lib/overview-scan/parts";
import {
  confirmMisspellings,
  unknownWords,
  type SpellingItem,
} from "@/lib/overview-scan/spelling";
import {
  norm,
  sentenceAround,
  sentences,
  words,
} from "@/lib/overview-scan/text";
import {
  flag,
  type Check,
  type Flag,
  type ScanBlock,
  type ScanDocument,
  type ScanPart,
} from "@/lib/overview-scan/types";

// The scan's content column (ODY-791), ported rule for rule from the
// prototype. Swears come from obscenity's English list and spelling from
// typo-js's en_US dictionary, in place of the prototype's hand-written lists.
// spelling.ts reads files, so these checks run on the server only.

type Text = {
  part: ScanPart;
  blockId: string | null;
  text: string;
  code?: readonly string[];
};

/** What a reader sees as text: lesson names, text blocks, tables and the description. */
function readableText(doc: ScanDocument): Text[] {
  const out: Text[] = [];
  for (const part of doc.parts) {
    if (part.kind === "lesson")
      out.push({ part, blockId: null, text: part.name });
    for (const b of part.blocks) {
      // Cells are kept apart, so two cells never read as one sentence
      const text =
        b.type === "table"
          ? b.rows.map((row) => row.join(" | ")).join(" | ")
          : blockText(b);
      if (text) out.push({ part, blockId: b.id, text, code: b.inlineCode });
    }
  }
  out.push({
    part: dropletPart(doc),
    blockId: "description",
    text: doc.droplet.description,
  });
  return out;
}

/** Every piece of text in the droplet, for the swear-word rule. */
function allText(doc: ScanDocument): Text[] {
  const out = readableText(doc);
  for (const part of doc.parts) {
    for (const b of part.blocks) {
      const strings =
        b.type === "image"
          ? [b.caption]
          : b.type === "quiz-mc"
            ? [b.question, ...b.options.map((o) => o.text)]
            : b.type === "quiz-tf"
              ? [b.question]
              : b.type === "quiz-open"
                ? [b.question, b.correctAnswer]
                : [];
      for (const text of strings)
        if (text) out.push({ part, blockId: b.id, text });
    }
  }
  const page = dropletPart(doc);
  for (const text of doc.droplet.learningObjectives)
    out.push({ part: page, blockId: "objectives", text });
  for (const step of doc.droplet.nextSteps)
    out.push({ part: page, blockId: "next-steps", text: step.label });
  out.push({ part: page, blockId: "fun-fact", text: doc.droplet.funFact });
  return out;
}

const PROSE_TYPES: readonly ScanBlock["type"][] = [
  "paragraph",
  "list",
  "callout",
];

const SWEAR_ALLOW = new Set(CONFIG.swearAllowWords);
let swearMatcher: RegExpMatcher | null = null;

/** The whole word holding the first swear word or slur in `text`, or null. */
function findSwear(text: string): string | null {
  swearMatcher ??= new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
  for (const m of swearMatcher.getAllMatches(text, true)) {
    // Widen the match to its word: "shit" in "bullshit", and "cock" in
    // "cockpit", which the allow list then lets through
    let start = m.startIndex;
    let end = m.endIndex + 1;
    while (start > 0 && /[A-Za-z]/.test(text[start - 1])) start--;
    while (end < text.length && /[A-Za-z]/.test(text[end])) end++;
    const word = text.slice(start, end);
    const lower = word.toLowerCase();
    if (!SWEAR_ALLOW.has(lower) && !SWEAR_ALLOW.has(lower.replace(/s$/, "")))
      return word;
  }
  return null;
}

const masked = (w: string) => w[0] + "*".repeat(Math.max(1, w.length - 1));

/** `"a", "b" and "c"`, naming at most five. */
function quoteList(list: readonly string[]): string {
  const shown = list.slice(0, 5).map((w) => `"${w}"`);
  const more = list.length - shown.length;
  if (more) return `${shown.join(", ")} and ${more} more`;
  return shown.length > 1
    ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`
    : shown[0];
}

/** A bracket or quote that opens more often than it closes, or null. */
function unclosedMark(text: string): string | null {
  const count = (re: RegExp) => (text.match(re) || []).length;
  if (count(/\(/g) > count(/\)/g)) return '"("';
  if (count(/\[/g) > count(/\]/g)) return '"["';
  if (count(/“/g) > count(/”/g)) return '"“"';
  // A " after a digit is an inch mark ("a 15\" laptop"), not a quote
  if (count(/(?<!\d)"/g) % 2 === 1) return 'double quote (")';
  return null;
}

/** Why a block counts as empty, or null when it isn't. */
function emptyBlock(b: ScanBlock): string | null {
  switch (b.type) {
    case "heading":
    case "paragraph":
    case "list":
    case "callout":
      return blockText(b).trim() ? null : `This ${b.type} is empty.`;
    case "image":
    case "video":
      return b.url ? null : `This ${b.type} has no URL.`;
    case "quiz-mc":
    case "quiz-tf":
    case "quiz-open":
      return b.question.trim() ? null : "This quiz has no question.";
    case "code":
      return b.code.trim()
        ? null
        : `This ${b.variant === "notebook" ? "notebook" : "code"} block has no code.`;
    default:
      return null;
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

// A term matches with an ending too: "whitelisted", "sanity checks"
const INCLUSIVE_TERMS = Object.entries(CONFIG.inclusiveTerms).map(
  ([term, replacement]) => ({
    re: new RegExp(`\\b${escapeRe(term)}(?:s|es|ed|ing)?\\b`, "i"),
    replacement,
  }),
);

const HEADING_ALLOW = new Set(CONFIG.headingAllowWords);
const HEADING_SHORT = new Set(CONFIG.headingShortWords);
const DOUBLED_ALLOW = new Set(CONFIG.doubledWordsAllow);
const trimmed = (word: string) =>
  word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

/**
 * Whether a heading mixes sentence case and Title Case (ODY-903): the first
 * lowercase and the first capitalized word, or null when it keeps to one.
 * Words that fit either style don't count: the first word, one after a ":",
 * short words ("for", "with"), acronyms, code names, allowed names and words
 * in the heading's inline code.
 */
function mixedCase(
  heading: string,
  code: readonly string[] = [],
): { lower: string; upper: string } | null {
  const inCode = new Set(code.flatMap(words));
  const tokens = heading.split(/\s+/);
  let lower: string | null = null;
  let upper: string | null = null;
  for (let i = 1; i < tokens.length; i++) {
    const word = tokens[i];
    if (!/^[A-Za-z]/.test(word) || tokens[i - 1].endsWith(":")) continue;
    if (HEADING_SHORT.has(word.toLowerCase())) continue;
    const letters = word.replace(/['’]s$/, "").replace(/[^A-Za-z]/g, "");
    // Acronyms and code names ("SQL", "JavaScript") keep their capitals
    if (/[A-Z].*[A-Z]|[a-z][A-Z]/.test(letters)) continue;
    if (HEADING_ALLOW.has(letters) || inCode.has(trimmed(word))) continue;
    if (/^[A-Z]/.test(word)) upper ??= trimmed(word);
    else lower ??= trimmed(word);
  }
  return lower && upper ? { lower, upper } : null;
}

const AI_NOTE = {
  failed:
    "The AI double-check didn't run, so these are the dictionary's flags.",
  budget:
    "The AI double-check didn't run because this month's AI budget is used up, so these are the dictionary's flags.",
} as const;

const notKnown = (unknown: readonly string[]) =>
  `${quoteList(unknown)} ${unknown.length > 1 ? "aren't" : "isn't"} in the dictionary or the tech word list.`;

/**
 * The dictionary's unknown words, double-checked by AI in their sentence
 * (ODY-904): one call for the whole droplet, made only when the dictionary
 * flagged something. Words past the call's limit stay flagged. If the call
 * doesn't run, the dictionary's flags stand, with a note saying so.
 */
async function spellingFlags(doc: ScanDocument): Promise<Flag[]> {
  const found = readableText(doc)
    .map((s) => ({ s, unknown: unknownWords(s.text, s.code) }))
    .filter((f) => f.unknown.length > 0);
  if (found.length === 0) return [];

  const items: SpellingItem[] = [];
  const itemOf = new Map<string, number>();
  const keyOf = (word: string, sentence: string) => `${word}\u0000${sentence}`;
  for (const { s, unknown } of found) {
    for (const word of unknown) {
      const sentence = sentenceAround(s.text, word);
      const key = keyOf(word, sentence);
      if (itemOf.has(key) || items.length >= CONFIG.aiSpellingMaxWords)
        continue;
      itemOf.set(key, items.length);
      items.push({ word, sentence });
    }
  }

  const check = await confirmMisspellings(items);
  if (!check.ok) {
    return [
      ...found.map(({ s, unknown }) =>
        flag(s.part, s.blockId, notKnown(unknown)),
      ),
      flag(dropletPart(doc), null, AI_NOTE[check.reason], "unknown"),
    ];
  }
  return found.flatMap(({ s, unknown }) => {
    const kept = unknown.filter((word) => {
      const id = itemOf.get(keyOf(word, sentenceAround(s.text, word)));
      return id === undefined || check.misspelled.has(id);
    });
    return kept.length ? [flag(s.part, s.blockId, notKnown(kept))] : [];
  });
}

export const CONTENT_CHECKS: readonly Check[] = [
  {
    id: "style",
    group: "content",
    title: "Style",
    description:
      "Headings look the same everywhere, and the language is clean.",
    scope: "headings, lesson text, quiz text, captions and the droplet page",
    rules: [
      {
        id: "sentence-case",
        text: 'Every heading uses one style: sentence case ("Data science for beginners") or Title Case ("Data Science for Beginners"). Short words such as "for" and "with", acronyms, and names such as SQL and Python fit either',
        run: (doc) =>
          doc.parts.flatMap((part) =>
            part.blocks.flatMap((b): Flag[] => {
              if (b.type !== "heading") return [];
              const mixed = mixedCase(b.text, b.inlineCode);
              return mixed
                ? [
                    flag(
                      part,
                      b.id,
                      `"${b.text}" mixes sentence case and Title Case: "${mixed.lower}" is lowercase but "${mixed.upper}" is capitalized. Use one style for the whole heading.`,
                    ),
                  ]
                : [];
            }),
          ),
      },
      {
        id: "swears",
        text: "No swear words or slurs detected",
        run: (doc) =>
          allText(doc).flatMap((s) => {
            const hit = findSwear(s.text);
            return hit
              ? [
                  flag(
                    s.part,
                    s.blockId,
                    `Contains a swear word or slur ("${masked(hit)}").`,
                  ),
                ]
              : [];
          }),
      },
    ],
  },
  {
    id: "quality",
    group: "content",
    title: "Quality",
    description: "Nothing is left half-built.",
    scope: "every block on the droplet page and in every lesson",
    rules: [
      {
        id: "empty-blocks",
        text: "No empty blocks: every text block has text, every image and video has a URL, every quiz has a question and every code block has code",
        run: (doc) =>
          doc.parts.flatMap((part) =>
            part.blocks.flatMap((b) => {
              const why = emptyBlock(b);
              return why ? [flag(part, b.id, why)] : [];
            }),
          ),
      },
    ],
  },
  {
    id: "spelling",
    group: "content",
    title: "Spelling and grammar",
    description: "Catches typos before students see them.",
    scope: "lesson text, lesson names, the Overview and the description",
    rules: [
      {
        id: "dictionary",
        text: "Every word is in the English dictionary or Odyssey's tech word list. Words that aren't are double-checked by AI in their sentence, and only real misspellings are flagged",
        run: spellingFlags,
      },
      {
        id: "doubled-words",
        text: 'The same word never appears twice in a row ("the the")',
        run: (doc) =>
          readableText(doc).flatMap((s) => {
            // "that that" and "had had" are correct English (ODY-903)
            const m = [...s.text.matchAll(/\b([A-Za-z]+)\s+\1\b/gi)].find(
              (hit) => !DOUBLED_ALLOW.has(hit[1].toLowerCase()),
            );
            return m ? [flag(s.part, s.blockId, `Repeats "${m[0]}".`)] : [];
          }),
      },
      {
        id: "unclosed",
        text: 'Every bracket or quote is closed: no opening "(" or "“" without a partner in the same paragraph',
        run: (doc) =>
          readableText(doc).flatMap((s) => {
            const mark = unclosedMark(s.text);
            return mark
              ? [flag(s.part, s.blockId, `An opening ${mark} is never closed.`)]
              : [];
          }),
      },
    ],
  },
  {
    id: "readability",
    group: "content",
    title: "Readability",
    description: "Keeps sentences and paragraphs short enough to follow.",
    scope: "paragraphs, lists and callouts in every lesson",
    rules: [
      {
        id: "sentence-length",
        text: `Sentences average ${CONFIG.maxAvgSentenceWords} words or fewer in each lesson`,
        run: (doc) =>
          lessonParts(doc).flatMap((part) => {
            const text = part.blocks
              .filter((b) => PROSE_TYPES.includes(b.type))
              .map(blockText)
              .join(" ");
            const count = sentences(text).length;
            const avg = count ? words(text).length / count : 0;
            return avg > CONFIG.maxAvgSentenceWords
              ? [
                  flag(
                    part,
                    null,
                    `Sentences average ${Math.round(avg)} words (limit ${CONFIG.maxAvgSentenceWords}).`,
                  ),
                ]
              : [];
          }),
      },
      {
        id: "paragraph-length",
        text: `No paragraph has more than ${CONFIG.maxParagraphSentences} sentences`,
        // Lists aren't paragraphs: each item would count as a sentence
        run: (doc) =>
          doc.parts.flatMap((part) =>
            part.blocks.flatMap((b) => {
              if (b.type !== "paragraph" && b.type !== "callout") return [];
              const n = sentences(b.text).length;
              return n > CONFIG.maxParagraphSentences
                ? [
                    flag(
                      part,
                      b.id,
                      `A paragraph has ${n} sentences (limit ${CONFIG.maxParagraphSentences}).`,
                    ),
                  ]
                : [];
            }),
          ),
      },
    ],
  },
  {
    id: "inclusive",
    group: "content",
    title: "Inclusive language",
    description: "Avoids terms that can exclude or put off students.",
    scope: "lesson text, the Overview and the description",
    rules: [
      {
        id: "terms",
        text: 'No term from the inclusive-language list appears (for example whitelist/blacklist, master/slave, "guys", "sanity check"). Each flag suggests a replacement',
        run: (doc) =>
          readableText(doc).flatMap((s) =>
            INCLUSIVE_TERMS.flatMap(({ re, replacement }) => {
              const m = re.exec(s.text);
              return m
                ? [
                    flag(
                      s.part,
                      s.blockId,
                      `Uses "${m[0]}". Try "${replacement}".`,
                    ),
                  ]
                : [];
            }),
          ),
      },
    ],
  },
  {
    id: "lesson-titles",
    group: "content",
    title: "Lesson titles",
    description: "Every lesson has a clear, distinct name.",
    scope: "the name of every lesson",
    rules: [
      {
        id: "has-name",
        text: "Every lesson's name has text, not only spaces",
        run: (doc) =>
          lessonParts(doc)
            .filter((p) => !p.name.trim())
            .map((p) => flag(p, null, "This lesson has no name.")),
      },
      {
        id: "unique-names",
        text: "No two lessons in the droplet have the same name, ignoring case",
        run(doc) {
          const seen = new Map<string, ScanPart>();
          const out: Flag[] = [];
          for (const p of lessonParts(doc)) {
            const key = norm(p.name);
            const first = seen.get(key);
            if (key && first)
              out.push(flag(p, null, `Same name as ${first.title}.`));
            else seen.set(key, p);
          }
          return out;
        },
      },
      {
        id: "name-length",
        text: `Every name is ${CONFIG.maxLessonNameChars} characters or fewer`,
        run: (doc) =>
          lessonParts(doc)
            .filter((p) => p.name.length > CONFIG.maxLessonNameChars)
            .map((p) =>
              flag(
                p,
                null,
                `The name is ${p.name.length} characters (limit ${CONFIG.maxLessonNameChars}).`,
              ),
            ),
      },
    ],
  },
];
