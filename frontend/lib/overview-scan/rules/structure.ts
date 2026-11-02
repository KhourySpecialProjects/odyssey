import { CONFIG } from "@/lib/overview-scan/config";
import {
  blockText,
  dropletPart,
  lessonParts,
  textBlocks,
} from "@/lib/overview-scan/parts";
import { norm, words } from "@/lib/overview-scan/text";
import {
  flag,
  type Check,
  type Flag,
  type ScanPart,
} from "@/lib/overview-scan/types";

// The scan's structure column (ODY-792), ported rule for rule from the prototype.

const fmt = (n: number) => n.toLocaleString("en-US");

export const STRUCTURE_CHECKS: readonly Check[] = [
  {
    id: "organization",
    group: "structure",
    title: "Organization",
    description:
      "Each lesson is laid out so students can find their way through it.",
    scope: "headings and paragraphs in every lesson",
    rules: [
      {
        id: "has-heading",
        text: "Every lesson has at least one heading",
        run: (doc) =>
          lessonParts(doc)
            .filter((p) => !p.blocks.some((b) => b.type === "heading"))
            .map((p) => flag(p, null, "This lesson has no headings.")),
      },
      {
        id: "heading-levels",
        text: "Heading levels never skip: an H3 only appears after an H2",
        run(doc) {
          const out: Flag[] = [];
          for (const part of lessonParts(doc)) {
            let previous = 1; // the lesson title is the H1
            for (const b of part.blocks) {
              if (b.type !== "heading") continue;
              if (b.level > previous + 1)
                out.push(
                  flag(
                    part,
                    b.id,
                    `"${b.text}" is an H${b.level} right after an H${previous}.`,
                  ),
                );
              previous = b.level;
            }
          }
          return out;
        },
      },
      {
        id: "no-repeats",
        text: "No paragraph appears word for word in two lessons",
        run(doc) {
          const firstSeen = new Map<string, ScanPart>();
          const out: Flag[] = [];
          for (const part of lessonParts(doc)) {
            for (const b of part.blocks) {
              if (b.type !== "paragraph") continue;
              const key = norm(b.text);
              if (!key) continue; // blank paragraphs aren't repeats
              const first = firstSeen.get(key);
              if (first && first !== part)
                out.push(
                  flag(
                    part,
                    b.id,
                    `This paragraph also appears in ${first.title}.`,
                  ),
                );
              else if (!first) firstSeen.set(key, part);
            }
          }
          return out;
        },
      },
    ],
  },
  {
    id: "granularity",
    group: "structure",
    title: "Granularity",
    description: "Keeps text blocks short and the droplet a sensible size.",
    scope: "every lesson",
    rules: [
      {
        id: "block-length",
        text: `No text block is over ${CONFIG.maxBlockWords} words`,
        run(doc) {
          const out: Flag[] = [];
          for (const part of lessonParts(doc)) {
            for (const b of textBlocks(part)) {
              const n = words(blockText(b)).length;
              if (n > CONFIG.maxBlockWords)
                out.push(
                  flag(
                    part,
                    b.id,
                    `A text block has ${fmt(n)} words (limit ${CONFIG.maxBlockWords}).`,
                  ),
                );
            }
          }
          return out;
        },
      },
      {
        id: "lesson-count",
        text: `The droplet has between ${CONFIG.lessonCount[0]} and ${CONFIG.lessonCount[1]} lessons`,
        run(doc) {
          const n = lessonParts(doc).length;
          const [min, max] = CONFIG.lessonCount;
          return n < min || n > max
            ? [
                flag(
                  dropletPart(doc),
                  null,
                  `The droplet has ${n} lessons (aim for ${min} to ${max}).`,
                ),
              ]
            : [];
        },
      },
    ],
  },
];
