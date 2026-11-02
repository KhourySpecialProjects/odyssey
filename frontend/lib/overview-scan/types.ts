import type { FetchUrl } from "./network"; // type-only: network.ts is server only

/**
 * The overview scan's shared shapes (ODY-787). ODY-793 created them for the
 * media checks; ODY-790's snapshot builds a ScanDocument and its runner drives
 * the checks. Add members freely; renaming one breaks the rules that read it.
 */

/** A link anywhere in a block's text. `url` is the raw href, trimmed. */
export type ScanLink = { text: string; url: string };

/** Every string is plain text: HTML stripped, entities decoded, whitespace collapsed. */
type BlockBase = {
  id: string; // BlockNote uuid, or the legacy component's id; may repeat when one
  // legacy block yields several (e.g. two <img> in one generic block)
  links?: readonly ScanLink[]; // every link in this block's text, in order
};

export type ScanBlock = BlockBase &
  (
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph"; text: string } // the droplet page's overview is { id: "overview" }
    | { type: "image"; url: string; caption: string } // legacy <img>: caption = alt
    | { type: "video"; url: string }
    | { type: "list"; items: readonly string[] } // consecutive list items, one block
    | { type: "callout"; text: string }
    | {
        type: "quiz-mc"; // one per question; legacy true/false stays quiz-mc
        question: string;
        options: readonly { text: string; isCorrect: boolean }[];
      }
    | { type: "quiz-tf"; question: string; correctAnswer: boolean } // BlockNote only
    | { type: "quiz-open"; question: string; correctAnswer: string }
    | {
        type: "code";
        variant: "code" | "notebook";
        language: string | null; // null = not stated (legacy <pre><code> with no class)
        code: string; // raw source, NOT whitespace-collapsed
        runnable: boolean; // legacy: false; notebook: true
      }
    | {
        type: "sandpack";
        template: string;
        files: Readonly<Record<string, string>>; // parsed from the JSON string; {} if unparsable
      }
  );
// Media rules filter by `type`, so extra members never break them.

export type ScanPart = {
  id: string; // "droplet" for the droplet page; the lesson's numeric Strapi id as a string otherwise
  kind: "droplet" | "lesson";
  title: string; // "Droplet page", "Lesson 2 · Finding missing values"
  blocks: readonly ScanBlock[];
};

export type ScanDataset = {
  name: string;
  fileUrl: string; // absolute S3/CDN URL, or "/uploads/…" locally
  rowCount: number | null; // null today for every dataset: uploads don't store it yet
};

export type ScanDroplet = {
  funFact: string; // "" when unset
  nextSteps: readonly { label: string; url: string }[]; // label "" when unset
  datasets: readonly ScanDataset[];
};

export type ScanDocument = {
  droplet: ScanDroplet; // ODY-790 adds the fields ODY-791/792 need
  parts: readonly ScanPart[]; // parts[0] is the droplet page, then lessons in order
};

export type FlagSeverity = "warn" | "unknown"; // needs attention | couldn't check

export type Flag = {
  partId: string;
  blockId: string | null; // a block id, or a droplet field id ("next-steps", "datasets", "fun-fact", …)
  message: string;
  severity: FlagSeverity;
};

/**
 * A rule only reports flags. The runner turns them into a status: needs
 * attention if any flag is "warn", couldn't check if all are "unknown",
 * passed if there are none.
 */
export type Rule = {
  id: string; // unique within its check
  text: string;
  run(doc: ScanDocument, fetchUrl: FetchUrl): Flag[] | Promise<Flag[]>;
};

export type Check = {
  id: string; // unique across all 23
  group: "content" | "structure" | "media";
  title: string;
  description: string;
  scope: string;
  note?: string;
  network?: boolean;
  rules: readonly Rule[];
};

export function flag(
  part: ScanPart,
  blockId: string | null,
  message: string,
  severity: FlagSeverity = "warn",
): Flag {
  return { partId: part.id, blockId, message, severity };
}
