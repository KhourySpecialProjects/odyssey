import { RULES_VERSION } from "./config";
import { statusOf, worst } from "./run";
import type {
  Check,
  Flag,
  FlagSeverity,
  OverviewScan,
  ScanDismissal,
  ScanFlagKey,
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
  key: ScanFlagKey;
  label: string;
  message: string;
  severity: FlagSeverity;
  href: string | null;
  linkText: "Go to lesson" | "Go to droplet page" | null;
};

export type DismissedFlagView = FlagView & {
  dismissedBy: string | null;
  dismissedAt: string;
};

export type RuleView = {
  id: string;
  text: string;
  status: ViewStatus;
  /** As the scan saved it, before any dismissal */
  savedStatus: ViewStatus;
  flags: FlagView[];
  dismissed: DismissedFlagView[];
};

export type CheckView = {
  id: string;
  title: string;
  description: string;
  scope: string;
  note?: string;
  status: ViewStatus;
  savedStatus: ViewStatus;
  flagCount: number;
  dismissedCount: number;
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
const byStatus = (a: { status: ViewStatus }, b: { status: ViewStatus }) =>
  RULE_ORDER.indexOf(a.status) - RULE_ORDER.indexOf(b.status);

/** One string per flag, for matching a dismissal to it (ODY-905). */
export const flagKeyId = (k: ScanFlagKey) =>
  JSON.stringify([k.checkId, k.ruleId, k.partId, k.blockId, k.message]);

/** A short, stable element id for a flag's card, so focus can follow it. */
export function scanFlagDomId(key: ScanFlagKey): string {
  let hash = 0x811c9dc5; // FNV-1a
  for (const ch of flagKeyId(key)) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `scan-flag-${hash.toString(36)}`;
}

function flagView(
  flag: Flag,
  lessons: ViewLesson[],
  slug: string,
  at: { checkId: string; ruleId: string },
): FlagView {
  const { message, severity } = flag;
  const key: ScanFlagKey = {
    ...at,
    partId: flag.partId,
    blockId: flag.blockId,
    message,
  };
  if (flag.partId === "droplet") {
    const section = flag.blockId ? DROPLET_SECTIONS[flag.blockId] : undefined;
    return {
      key,
      label: section ? `Droplet page · ${section}` : "Droplet page",
      message,
      severity,
      href: `/draft/d/${slug}${section ? `#${scanSectionId(flag.blockId!)}` : ""}`,
      linkText: "Go to droplet page",
    };
  }
  const index = lessons.findIndex((l) => String(l.id) === flag.partId);
  if (index === -1) {
    return {
      key,
      label: "Deleted lesson",
      message,
      severity,
      href: null,
      linkText: null,
    };
  }
  const lesson = lessons[index];
  return {
    key,
    label: `Lesson ${index + 1} · ${lesson.name}`,
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
        const ruleStatus: ViewStatus = r?.status ?? "not-run";
        return {
          id: rule.id,
          text: rule.text,
          status: ruleStatus,
          savedStatus: ruleStatus,
          flags: (r?.flags ?? []).map((f) =>
            flagView(f, lessons, slug, { checkId: check.id, ruleId: rule.id }),
          ),
          dismissed: [],
        };
      })
      .sort(byStatus);

    return {
      id: check.id,
      title: check.title,
      description: check.description,
      scope: check.scope,
      note: check.note,
      status,
      savedStatus: status,
      flagCount: rules.reduce((n, r) => n + r.flags.length, 0),
      dismissedCount: 0,
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

/**
 * The view with dismissed flags moved out of the count (ODY-905): a check whose
 * flags are all dismissed passes, and the header counts follow. A check with
 * no dismissed flag keeps its saved statuses. A dismissal that matches no flag
 * is ignored until that flag comes back; of two for one flag, the earlier shows.
 */
export function applyDismissals(
  view: ScanView,
  dismissals: readonly ScanDismissal[],
): ScanView {
  const byKey = new Map<string, ScanDismissal>();
  for (const d of [...dismissals].sort((a, b) =>
    a.dismissedAt.localeCompare(b.dismissedAt),
  )) {
    const id = flagKeyId(d);
    if (!byKey.has(id)) byKey.set(id, d);
  }
  const counts = { passed: 0, needsAttention: 0, couldNotCheck: 0 };

  const applyCheck = (check: CheckView): CheckView => {
    let dismissedCount = 0;
    const rules = check.rules.map((rule): RuleView => {
      const flags: FlagView[] = [];
      const dismissed: DismissedFlagView[] = [];
      for (const f of rule.flags) {
        const d = byKey.get(flagKeyId(f.key));
        if (d) {
          dismissed.push({
            ...f,
            dismissedBy: d.dismissedBy,
            dismissedAt: d.dismissedAt,
          });
        } else flags.push(f);
      }
      dismissedCount += dismissed.length;
      return { ...rule, flags, dismissed };
    });
    let next: CheckView = { ...check, rules, dismissedCount };
    if (dismissedCount > 0 && check.savedStatus !== "not-run") {
      const recomputed = rules
        .map((r) =>
          r.savedStatus === "not-run" ? r : { ...r, status: statusOf(r.flags) },
        )
        .sort(byStatus);
      next = {
        ...next,
        rules: recomputed,
        status: worst(
          recomputed
            .filter((r) => r.status !== "not-run")
            .map((r) => r.status as ScanStatus),
        ),
        flagCount: recomputed.reduce((n, r) => n + r.flags.length, 0),
      };
    }
    if (next.status === "pass") counts.passed++;
    if (next.status === "warn") counts.needsAttention++;
    if (next.status === "unknown") counts.couldNotCheck++;
    return next;
  };

  return {
    ...view,
    columns: view.columns.map((c) => ({
      ...c,
      checks: c.checks.map(applyCheck),
    })),
    counts,
  };
}
