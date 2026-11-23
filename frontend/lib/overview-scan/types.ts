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
  inlineCode?: readonly string[]; // code spans in this block's text ("df.isna()"), in order
};

export type ScanBlock = BlockBase &
  (
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph"; text: string } // the droplet page's overview is { id: "overview" }
    | { type: "image"; url: string; caption: string } // legacy <img>: caption = alt
    | { type: "video"; url: string }
    | { type: "list"; items: readonly string[] } // consecutive list items, one block
    | { type: "callout"; text: string }
    | { type: "table"; rows: readonly (readonly string[])[] } // cell text, row by row
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
  name: string; // the lesson's own name; "" for the droplet page
  title: string; // "Droplet page", "Lesson 2 · Finding missing values"
  blocks: readonly ScanBlock[];
};

export type ScanDataset = {
  name: string;
  fileUrl: string; // absolute S3/CDN URL, or "/uploads/…" locally
  rowCount: number | null; // null today for every dataset: uploads don't store it yet
};

/** A droplet linked as a prerequisite or postrequisite. */
export type LinkedDroplet = {
  id: number; // numeric Strapi id, used for comparisons
  name: string;
  status: "draft" | "edit" | "published";
  isHidden: boolean;
};

export type ScanDroplet = {
  id: number;
  originalDropletId: number | null; // set on [EDIT] drafts
  name: string;
  overview: string; // plain text; "" when unset
  description: string; // "" when unset
  learningObjectives: readonly string[]; // "" for an unset objective
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  tags: readonly string[]; // tag names
  prerequisites: readonly LinkedDroplet[];
  postrequisites: readonly LinkedDroplet[];
  funFact: string; // "" when unset
  nextSteps: readonly { label: string; url: string }[]; // label "" when unset
  datasets: readonly ScanDataset[];
};

export type ScanDocument = {
  droplet: ScanDroplet; // ODY-791 adds its fields here
  parts: readonly ScanPart[]; // parts[0] is the droplet page, then lessons in order
};

export type FlagSeverity = "warn" | "unknown"; // needs attention | couldn't check

export type Flag = {
  partId: string;
  blockId: string | null; // a block id, or a droplet field id ("next-steps", "datasets", "fun-fact", …)
  message: string;
  severity: FlagSeverity;
  /** The words a spelling flag is about, highlighted when its link opens (ODY-913) */
  words?: string[];
};

/**
 * Which flag a dismissal is for (ODY-905): its check and rule, where it is and
 * what it says. A flag whose message changes no longer matches, so it shows
 * again.
 */
export type ScanFlagKey = {
  checkId: string;
  ruleId: string;
  partId: string;
  blockId: string | null;
  message: string;
};

/** A flag someone marked as fine, saved on the droplet for everyone. */
export type ScanDismissal = ScanFlagKey & {
  dismissedBy: string | null; // their name, or null when unknown
  dismissedAt: string; // ISO datetime
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

/** A rule's or a check's outcome: passed, needs attention, couldn't check. */
export type ScanStatus = "pass" | "warn" | "unknown";

export type RuleResult = {
  id: string; // unique only within its check, so a rule is always read under its check
  status: ScanStatus;
  flags: readonly Flag[];
};

/** A check takes its worst rule's status: warn, then unknown, then pass. */
export type CheckResult = {
  id: string;
  status: ScanStatus;
  rules: readonly RuleResult[]; // in the check's rule order
};

/**
 * One saved run of the scan: a row of the `overview-scan` Strapi type
 * (ODY-788). The three counts are of checks, so they add up to the number run.
 */
export type OverviewScan = {
  id: number;
  documentId?: string;
  ranAt: string; // ISO datetime
  rulesVersion: string;
  passed: number;
  needsAttention: number;
  couldNotCheck: number;
  results: readonly CheckResult[]; // in check order
  droplet?: { id: number; documentId?: string } | null; // when populated
  ranBy?: {
    id: number;
    documentId?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null; // when populated
};

/** What runChecks returns (ODY-790): a scan before it's saved. */
export type ScanResult = Pick<
  OverviewScan,
  "rulesVersion" | "passed" | "needsAttention" | "couldNotCheck" | "results"
>;

export function flag(
  part: ScanPart,
  blockId: string | null,
  message: string,
  severity: FlagSeverity = "warn",
): Flag {
  return { partId: part.id, blockId, message, severity };
}
