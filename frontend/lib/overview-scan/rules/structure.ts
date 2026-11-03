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
  type ScanDocument,
  type ScanPart,
} from "@/lib/overview-scan/types";

// The scan's structure column (ODY-792), ported rule for rule from the prototype.

/** A flag on the droplet page, anchored to one of its sections. */
const page = (doc: ScanDocument, section: string, message: string) =>
  flag(dropletPart(doc), section, message);

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
  {
    id: "overview",
    group: "structure",
    title: "Overview",
    description: "Tells students what the droplet is about before they start.",
    scope: "the Overview on the droplet page",
    rules: [
      {
        id: "not-empty",
        text: "The Overview isn't empty",
        run: (doc) =>
          String(doc.droplet.overview || "").trim()
            ? []
            : [page(doc, "overview", "The Overview is empty.")],
      },
      {
        id: "length",
        text: `It's ${CONFIG.overviewWords[0]} to ${CONFIG.overviewWords[1]} words`,
        run(doc) {
          const n = words(doc.droplet.overview).length;
          const [min, max] = CONFIG.overviewWords;
          return n && (n < min || n > max)
            ? [
                page(
                  doc,
                  "overview",
                  `The Overview is ${n} words (aim for ${min} to ${max}).`,
                ),
              ]
            : [];
        },
      },
      {
        id: "not-description",
        text: "It isn't the same text as the description",
        run: (doc) =>
          norm(doc.droplet.overview) &&
          norm(doc.droplet.overview) === norm(doc.droplet.description)
            ? [
                page(
                  doc,
                  "overview",
                  "The Overview repeats the description word for word.",
                ),
              ]
            : [],
      },
    ],
  },
  {
    id: "objectives",
    group: "structure",
    title: "Learning objectives",
    description: "Says what students will be able to do by the end.",
    scope: "the learning objectives on the droplet page",
    rules: [
      {
        id: "count",
        text: `There are at least ${CONFIG.minObjectives}`,
        run(doc) {
          const n = doc.droplet.learningObjectives.filter((o) =>
            o.trim(),
          ).length;
          return n < CONFIG.minObjectives
            ? [
                page(
                  doc,
                  "objectives",
                  `There are ${n} learning objectives (at least ${CONFIG.minObjectives}).`,
                ),
              ]
            : [];
        },
      },
      {
        id: "no-blanks",
        text: "None is blank, and no two are the same, ignoring case",
        run(doc) {
          const list = doc.droplet.learningObjectives;
          const out: Flag[] = [];
          if (list.some((o) => !o.trim()))
            out.push(
              page(doc, "objectives", "One learning objective is blank."),
            );
          const keys = list.map(norm).filter(Boolean);
          if (new Set(keys).size !== keys.length)
            out.push(
              page(doc, "objectives", "Two learning objectives are the same."),
            );
          return out;
        },
      },
      {
        id: "action-verb",
        text: 'Each one starts with a word from the action-verb list ("Write", "Explain", "Build", "Compare"…)',
        run: (doc) =>
          doc.droplet.learningObjectives
            .filter((o) => o.trim())
            .flatMap((o) => {
              const first = words(o)[0];
              if (!first)
                return [
                  page(
                    doc,
                    "objectives",
                    `"${o}" doesn't start with a word. Try a verb such as "Explain".`,
                  ),
                ];
              return CONFIG.actionVerbs.includes(first.toLowerCase())
                ? []
                : [
                    page(
                      doc,
                      "objectives",
                      `"${o}" starts with "${first}", which isn't on the action-verb list. Try a verb such as "Explain".`,
                    ),
                  ];
            }),
      },
    ],
  },
  {
    id: "prerequisites",
    group: "structure",
    title: "Prerequisites",
    description: "Points students at droplets they can actually open.",
    scope: "prerequisites and postrequisites on the droplet page",
    rules: [
      {
        id: "published",
        text: "Every prerequisite and postrequisite is a published droplet that isn't hidden",
        run: (doc) =>
          [...doc.droplet.prerequisites, ...doc.droplet.postrequisites]
            .filter((p) => p.status !== "published" || p.isHidden)
            .map((p) =>
              page(
                doc,
                "prerequisites",
                `"${p.name}" is ${p.isHidden ? "hidden" : "not published"}.`,
              ),
            ),
      },
      {
        id: "no-loops",
        text: "The droplet isn't its own prerequisite or postrequisite, and no droplet is listed as both a prerequisite and a postrequisite",
        run(doc) {
          const { id, originalDropletId } = doc.droplet;
          const isSelf = (l: { id: number }) =>
            l.id === id ||
            (originalDropletId !== null && l.id === originalDropletId);
          const pre = doc.droplet.prerequisites;
          const post = doc.droplet.postrequisites;
          const out: Flag[] = [];
          if (pre.some(isSelf))
            out.push(
              page(
                doc,
                "prerequisites",
                "The droplet is listed as its own prerequisite.",
              ),
            );
          if (pre.some((p) => post.some((q) => q.id === p.id)))
            out.push(
              page(
                doc,
                "prerequisites",
                "A droplet is listed as both a prerequisite and a postrequisite.",
              ),
            );
          if (post.some(isSelf))
            out.push(
              page(
                doc,
                "prerequisites",
                "The droplet is listed as its own postrequisite.",
              ),
            );
          return out;
        },
      },
    ],
  },
  {
    id: "next-steps",
    group: "structure",
    title: "Next steps",
    description: "Gives students somewhere to go after the last lesson.",
    scope: "next steps on the droplet page",
    rules: [
      {
        id: "at-least-one",
        text: "There's at least one next step",
        run: (doc) =>
          doc.droplet.nextSteps.length
            ? []
            : [page(doc, "next-steps", "There are no next steps.")],
      },
      {
        id: "label-and-https",
        text: "Each has a label and a URL that starts with https://",
        run: (doc) =>
          doc.droplet.nextSteps
            .filter(
              (s) =>
                !String(s.label || "").trim() ||
                !String(s.url || "").startsWith("https://"),
            )
            .map((s) =>
              page(
                doc,
                "next-steps",
                `Next step "${s.label || s.url}" needs a label and an https:// URL.`,
              ),
            ),
      },
    ],
  },
  {
    id: "description",
    group: "structure",
    title: "Description",
    description: "The short summary shown on the droplet's card.",
    scope: "the description on the droplet page",
    rules: [
      {
        id: "length",
        text: `The description is ${CONFIG.descriptionChars[0]} to ${CONFIG.descriptionChars[1]} characters`,
        run(doc) {
          const n = String(doc.droplet.description || "").trim().length;
          const [min, max] = CONFIG.descriptionChars;
          return n < min || n > max
            ? [
                page(
                  doc,
                  "description",
                  `The description is ${n} characters (aim for ${min} to ${max}).`,
                ),
              ]
            : [];
        },
      },
    ],
  },
  {
    id: "tags",
    group: "structure",
    title: "Tags and focus area",
    description: "Helps students find the droplet when they search and filter.",
    scope: "difficulty and tags on the droplet page",
    rules: [
      {
        id: "difficulty",
        text: "Difficulty is set",
        run: (doc) =>
          doc.droplet.difficulty
            ? []
            : [page(doc, "tags", "Difficulty isn't set.")],
      },
      {
        id: "has-tag",
        text: "The droplet has at least one tag",
        run: (doc) =>
          doc.droplet.tags.length
            ? []
            : [page(doc, "tags", "The droplet has no tags.")],
      },
    ],
  },
];
