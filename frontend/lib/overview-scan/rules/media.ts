import { CONFIG } from "@/lib/overview-scan/config";
import { norm, words } from "@/lib/overview-scan/text";
import {
  flag,
  type Check,
  type Flag,
  type ScanBlock,
  type ScanDocument,
  type ScanPart,
} from "@/lib/overview-scan/types";

/**
 * The scan's Media and accessibility column (ODY-793), ported rule for rule
 * from the prototype. Rules only return flags; the runner (ODY-790) turns
 * them into passed, needs attention or couldn't check.
 */

type BlockOf<T extends ScanBlock["type"]> = Extract<ScanBlock, { type: T }>;

/** Every block of the given types, in document order, with its part. */
function blocksOf<T extends ScanBlock["type"]>(
  doc: ScanDocument,
  ...types: T[]
) {
  return doc.parts.flatMap((part) =>
    part.blocks
      .filter((b): b is BlockOf<T> => (types as string[]).includes(b.type))
      .map((block) => ({ part, block })),
  );
}

const blank = (text: string) => !String(text ?? "").trim();
const dropletPart = (doc: ScanDocument): ScanPart => doc.parts[0];
const BARE_URL = /^(https?:\/\/|www\.)/;

const accessibility: Check = {
  id: "accessibility",
  group: "media",
  title: "Accessibility",
  description: "Makes the droplet usable with a screen reader.",
  scope: "images, links and headings in every lesson",
  rules: [
    {
      id: "image-captions",
      text: "Every image has a caption. The caption is used as the image's alt text for screen readers",
      run: (doc) =>
        blocksOf(doc, "image")
          .filter(({ block }) => blank(block.caption))
          .map(({ part, block }) =>
            flag(
              part,
              block.id,
              'This image has no caption, so screen readers only hear "Image".',
            ),
          ),
    },
    {
      id: "link-text",
      text: 'Every link\'s text says where it goes: none is "here", "click here", "link", "this" or a bare URL',
      run: (doc) =>
        doc.parts.flatMap((part) =>
          part.blocks.flatMap((block) =>
            (block.links ?? [])
              .filter((link) => {
                const text = norm(link.text);
                return (
                  (CONFIG.vagueLinkText as readonly string[]).includes(text) ||
                  BARE_URL.test(text)
                );
              })
              .map((link) =>
                flag(
                  part,
                  block.id,
                  `The link text "${link.text}" doesn't say where it goes.`,
                ),
              ),
          ),
        ),
    },
    {
      id: "heading-length",
      text: `No heading is too long (over ${CONFIG.maxHeadingWords} words)`,
      run: (doc) =>
        blocksOf(doc, "heading").flatMap(({ part, block }) => {
          const n = words(block.text).length;
          return n > CONFIG.maxHeadingWords
            ? [
                flag(
                  part,
                  block.id,
                  `This heading is ${n} words (limit ${CONFIG.maxHeadingWords}). A sentence made into a heading confuses screen-reader navigation.`,
                ),
              ]
            : [];
        }),
    },
  ],
};

const quizzes: Check = {
  id: "quizzes",
  group: "media",
  title: "Quizzes",
  description: "Every question can actually be answered.",
  scope: "multiple-choice and true/false questions in every lesson",
  note: "If a lesson doesn't have a quiz, that's OK.",
  rules: [
    {
      id: "question-text",
      text: "Every question has text",
      run: (doc) =>
        blocksOf(doc, "quiz-mc", "quiz-tf")
          .filter(({ block }) => blank(block.question))
          .map(({ part, block }) =>
            flag(part, block.id, "This question has no text."),
          ),
    },
    {
      id: "options",
      text: "Every multiple-choice question has at least 2 options, none blank or repeated, with at least one marked correct",
      run: (doc) =>
        blocksOf(doc, "quiz-mc").flatMap(({ part, block }) => {
          const keys = block.options.map((o) => norm(o.text));
          const problems = [
            keys.length < 2 && "This question has fewer than 2 options.",
            keys.some((k) => !k) && "This question has a blank option.",
            new Set(keys).size !== keys.length &&
              "This question repeats an option.",
            !block.options.some((o) => o.isCorrect) &&
              "No option is marked correct.",
          ];
          return problems
            .filter((p): p is string => !!p)
            .map((message) => flag(part, block.id, message));
        }),
    },
  ],
};

const openEnded: Check = {
  id: "open-ended",
  group: "media",
  title: "Open-ended questions",
  description: "Open questions have what's needed to grade them.",
  scope: "open-ended questions in every lesson",
  rules: [
    {
      id: "question-text",
      text: "Every question has text",
      run: (doc) =>
        blocksOf(doc, "quiz-open")
          .filter(({ block }) => blank(block.question))
          .map(({ part, block }) =>
            flag(part, block.id, "This question has no text."),
          ),
    },
    {
      id: "model-answer",
      text: "Every question has a model answer filled in",
      run: (doc) =>
        blocksOf(doc, "quiz-open")
          .filter(({ block }) => blank(block.correctAnswer))
          .map(({ part, block }) =>
            flag(
              part,
              block.id,
              "This question has no model answer to grade against.",
            ),
          ),
    },
  ],
};

const code: Check = {
  id: "code",
  group: "media",
  title: "Code blocks",
  description: "Every code block has code the runner can handle.",
  scope: "code blocks in every lesson",
  rules: [
    {
      id: "has-code",
      text: "Every code block and notebook block has code, and every Sandpack block has at least one file with content",
      run: (doc) =>
        blocksOf(doc, "code", "sandpack").flatMap(({ part, block }): Flag[] => {
          if (block.type === "sandpack")
            return Object.values(block.files).every(blank)
              ? [
                  flag(
                    part,
                    block.id,
                    "This Sandpack block has no files with code.",
                  ),
                ]
              : [];
          if (!blank(block.code)) return [];
          const kind = block.variant === "notebook" ? "notebook" : "code";
          return [flag(part, block.id, `This ${kind} block is empty.`)];
        }),
    },
    {
      id: "language",
      text: "Every block's language is one the code runner supports",
      // Only what actually runs: display-only blocks may show any language,
      // and notebooks always run Python
      run: (doc) =>
        blocksOf(doc, "code", "sandpack").flatMap(({ part, block }): Flag[] => {
          if (block.type === "sandpack")
            return (CONFIG.sandpackTemplates as readonly string[]).includes(
              block.template,
            )
              ? []
              : [
                  flag(
                    part,
                    block.id,
                    `Sandpack doesn't support the "${block.template}" template.`,
                  ),
                ];
          if (block.variant !== "code" || !block.runnable) return [];
          if (block.language === null)
            return [
              flag(part, block.id, "This code block has no language set."),
            ];
          return CONFIG.codeLanguages.includes(block.language)
            ? []
            : [
                flag(
                  part,
                  block.id,
                  `The code runner doesn't support "${block.language}".`,
                ),
              ];
        }),
    },
  ],
};

const funFact: Check = {
  id: "fun-fact",
  group: "media",
  title: "Fun fact",
  description: "The fun fact shown when a student finishes.",
  scope: "the fun fact on the droplet page",
  rules: [
    {
      id: "not-empty",
      text: "The fun fact isn't empty",
      run: (doc) =>
        blank(doc.droplet.funFact)
          ? [flag(dropletPart(doc), "fun-fact", "There's no fun fact.")]
          : [],
    },
  ],
};

// The network checks (Images, Videos, Links, Datasets) join in their
// prototype positions in ODY-793's second PR
export const MEDIA_CHECKS: readonly Check[] = [
  accessibility,
  quizzes,
  openEnded,
  code,
  funFact,
];
