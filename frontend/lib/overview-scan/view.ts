import { RULES_VERSION } from "./config";
import type {
  Check,
  Flag,
  FlagSeverity,
  OverviewScan,
  ScanStatus,
} from "./types";

// The scan page's view model (ODY-795): plain data, so a client component can take it.

export type ViewStatus = ScanStatus | "not-run";

export const STATUS_WORDS: Record<ViewStatus | "running", string> = {
  pass: "Passed",
  warn: "Needs attention",
  unknown: "Couldn't check",
  "not-run": "Not run yet",
  running: "Checking",
};

export const GROUPS = [
  ["content", "Content"],
  ["structure", "Structure"],
  ["media", "Media and accessibility"],
] as const;

export const DROPLET_SECTIONS: Record<string, string> = {
  overview: "Overview",
  description: "Description",
  objectives: "Learning objectives",
  prerequisites: "Prerequisites",
  "next-steps": "Next steps",
  tags: "Tags and difficulty",
  datasets: "Datasets",
  "fun-fact": "Fun fact",
};

/** The element id on the droplet page that a flag's link scrolls to. */
export const scanSectionId = (blockId: string) => `scan-${blockId}`;

export type FlagView = {
  label: string;
  message: string;
  severity: FlagSeverity;
  href: string | null;
  linkText: "Go to lesson" | "Go to droplet page" | null;
};

export type RuleView = {
  id: string;
  text: string;
  status: ViewStatus;
  flags: FlagView[];
};

export type CheckView = {
  id: string;
  title: string;
  description: string;
  scope: string;
  note?: string;
  status: ViewStatus;
  flagCount: number;
  rules: RuleView[];
};

export type ScanView = {
  columns: { group: Check["group"]; title: string; checks: CheckView[] }[];
  checkCount: number;
  counts: { passed: number; needsAttention: number; couldNotCheck: number };
  ranAt: string | null;
  ranBy: string | null;
  checksChanged: boolean;
  editedSince: boolean;
  rulesVersion: string;
  ruleCount: number;
};

/** The droplet's lessons, in order. */
export type ViewLesson = {
  id: number;
  name: string;
  slug: string;
  updatedAt?: string;
};

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

const RULE_ORDER: ViewStatus[] = ["warn", "unknown", "pass", "not-run"];

function flagView(flag: Flag, lessons: ViewLesson[], slug: string): FlagView {
  const { message, severity } = flag;
  if (flag.partId === "droplet") {
    const section = flag.blockId ? DROPLET_SECTIONS[flag.blockId] : undefined;
    return {
      label: section ? `Droplet page · ${section}` : "Droplet page",
      message,
      severity,
      href: `/draft/d/${slug}${section ? `#${scanSectionId(flag.blockId!)}` : ""}`,
      linkText: "Go to droplet page",
    };
  }
  const at = lessons.findIndex((l) => String(l.id) === flag.partId);
  if (at === -1) {
    return {
      label: "Deleted lesson",
      message,
      severity,
      href: null,
      linkText: null,
    };
  }
  const lesson = lessons[at];
  return {
    label: `Lesson ${at + 1} · ${lesson.name}`,
    message,
    severity,
    href: `/draft/d/${slug}/${lesson.slug}`,
    linkText: "Go to lesson",
  };
}

/** Joins the current checks with the saved scan by id; the page passes CHECKS in. */
export function buildScanView({
  checks,
  scan,
  lessons,
  dropletUpdatedAt,
  slug,
}: {
  checks: readonly Check[];
  scan: OverviewScan | null;
  lessons: ViewLesson[];
  dropletUpdatedAt?: string;
  slug: string;
}): ScanView {
  const saved = new Map((scan?.results ?? []).map((r) => [r.id, r]));
  const counts = { passed: 0, needsAttention: 0, couldNotCheck: 0 };
  let missing = false;

  const toCheckView = (check: Check): CheckView => {
    const result = saved.get(check.id);
    if (!result) missing = true;
    const status: ViewStatus = result?.status ?? "not-run";
    if (status === "pass") counts.passed++;
    if (status === "warn") counts.needsAttention++;
    if (status === "unknown") counts.couldNotCheck++;

    const rules = check.rules
      .map((rule): RuleView => {
        const r = result?.rules.find((x) => x.id === rule.id);
        if (result && !r) missing = true;
        return {
          id: rule.id,
          text: rule.text,
          status: r?.status ?? "not-run",
          flags: (r?.flags ?? []).map((f) => flagView(f, lessons, slug)),
        };
      })
      .sort(
        (a, b) => RULE_ORDER.indexOf(a.status) - RULE_ORDER.indexOf(b.status),
      );

    return {
      id: check.id,
      title: check.title,
      description: check.description,
      scope: check.scope,
      note: check.note,
      status,
      flagCount: rules.reduce((n, r) => n + r.flags.length, 0),
      rules,
    };
  };

  const columns = GROUPS.map(([group, title]) => ({
    group,
    title,
    checks: checks.filter((c) => c.group === group).map(toCheckView),
  }));

  const name = [scan?.ranBy?.firstName, scan?.ranBy?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    columns,
    checkCount: checks.length,
    counts,
    ranAt: scan?.ranAt ?? null,
    ranBy: name || null,
    rulesVersion: RULES_VERSION,
    ruleCount: checks.reduce((n, c) => n + c.rules.length, 0),
    checksChanged: !!scan && (scan.rulesVersion !== RULES_VERSION || missing),
    // Lock heartbeats bump updatedAt, so this can show falsely; deleting an unflagged
    // lesson is missed (ODY-878).
    editedSince:
      !!scan &&
      ([dropletUpdatedAt, ...lessons.map((l) => l.updatedAt)].some(
        (t) => !!t && Date.parse(t) > Date.parse(scan.ranAt),
      ) ||
        scan.results.some((c) =>
          c.rules.some((r) =>
            r.flags.some(
              (f) =>
                f.partId !== "droplet" &&
                !lessons.some((l) => String(l.id) === f.partId),
            ),
          ),
        )),
  };
}
