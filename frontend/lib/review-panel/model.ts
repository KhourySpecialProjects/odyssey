import type { AiFinding, AiRunProgress, AiRunSection } from "@/types";
import type { AiScoringRunState } from "@/types";
import { BAND_LABEL, type Band } from "./colors";
import { sortByPosition, type Position } from "./positions";

export type { Band };

/** A score as the panel sees it; `lessonId` null is the Overall Score */
export type PanelScore = {
  lessonId: number | null;
  criterionId: number;
  value: number | null;
  aiValue: number | null;
  aiRationale?: string | null;
  aiFindings?: AiFinding[] | null;
};

type CriterionRef = { id: number; active?: boolean };

export type CardStatus = "not_scored" | "to_confirm" | "confirmed";

export type PanelRun = {
  runState: AiScoringRunState;
  progress?: AiRunProgress | null;
  failedLessons?: AiRunSection[] | null;
};

export type AiBarState =
  | { kind: "none" }
  | {
      kind: "scoring";
      currentName: string | null;
      done: number;
      total: number;
    }
  | { kind: "scored" }
  | { kind: "partial"; failedNames: string[] }
  | { kind: "failed"; failedNames: string[] };

const OVERALL_NAME = "Overall Score";

/** Good is 4-5, OK is 3, Needs work is 1-2 */
export function bandOf(score: number | null | undefined): Band {
  if (score == null) return "unscored";
  return score >= 4 ? "good" : score === 3 ? "ok" : "needs_work";
}

/** The score a circle shows: the reviewer's, else the AI's */
export function effective(
  s: Pick<PanelScore, "value" | "aiValue">,
): number | null {
  return s.value ?? s.aiValue ?? null;
}

const activeOnly = (criteria: CriterionRef[]) =>
  criteria.filter((c) => c.active !== false);

/** One card's status over its scope's scores; inactive criteria are ignored */
export function cardStatus(
  criteria: CriterionRef[],
  scores: PanelScore[],
): CardStatus {
  const active = activeOnly(criteria);
  const byCriterion = new Map(scores.map((s) => [s.criterionId, s]));
  const found = active.map((c) => byCriterion.get(c.id));
  if (!found.some((s) => s && effective(s) !== null)) return "not_scored";
  return found.every((s) => s && s.value !== null) ? "confirmed" : "to_confirm";
}

/** Every active criterion has an Overall `value`; no criteria counts as confirmed */
export function overallConfirmed(
  criteria: CriterionRef[],
  scores: PanelScore[],
): boolean {
  const overall = scores.filter((s) => s.lessonId === null);
  return activeOnly(criteria).every((c) =>
    overall.some((s) => s.criterionId === c.id && s.value !== null),
  );
}

/** The lowest effective score per lesson, over active criteria, for lessons that need a dot */
export function lessonDots(
  scores: PanelScore[],
  criteria: CriterionRef[],
): Record<number, "ok" | "needs_work"> {
  const active = new Set(activeOnly(criteria).map((c) => c.id));
  const lowest = new Map<number, number>();
  for (const s of scores) {
    const v = effective(s);
    if (s.lessonId === null || v === null || !active.has(s.criterionId)) {
      continue;
    }
    lowest.set(s.lessonId, Math.min(lowest.get(s.lessonId) ?? v, v));
  }
  const dots: Record<number, "ok" | "needs_work"> = {};
  for (const [id, v] of lowest) {
    const band = bandOf(v);
    if (band === "ok" || band === "needs_work") dots[id] = band;
  }
  return dots;
}

/** What the AI bar shows, from the latest run and the lessons in order */
export function aiBarState(
  run: PanelRun | null,
  lessons: { id: number; name: string }[],
): AiBarState {
  if (!run) return { kind: "none" };
  const nameOf = (s: AiRunSection | null | undefined) =>
    s === "overall"
      ? OVERALL_NAME
      : lessons.find((l) => l.id === s)?.name ?? null;
  switch (run.runState) {
    case "queued":
    case "running":
      return {
        kind: "scoring",
        currentName: nameOf(run.progress?.current),
        done: run.progress?.done.length ?? 0,
        total: lessons.length + 1,
      };
    case "done":
      return { kind: "scored" };
    default: {
      const failedNames = (run.failedLessons ?? []).flatMap((s) => {
        const name = nameOf(s);
        return name ? [name] : [];
      });
      return { kind: run.runState, failedNames };
    }
  }
}

/** Sections (each lesson, then Overall) whose card is confirmed, out of all */
export function confirmedCount(
  lessonIds: number[],
  criteria: CriterionRef[],
  scores: PanelScore[],
): { confirmed: number; total: number } {
  const sections = [...lessonIds, null];
  const confirmed = sections.filter(
    (id) =>
      cardStatus(
        criteria,
        scores.filter((s) => s.lessonId === id),
      ) === "confirmed",
  ).length;
  return { confirmed, total: sections.length };
}

/** A score's findings that aren't dismissed, numbered 1..n in reading order */
export function visibleFindings(
  score: Pick<PanelScore, "aiFindings">,
  dismissed: ReadonlySet<string>,
  positions: Record<string, Position> = {},
): { finding: AiFinding; number: number }[] {
  const shown = (score.aiFindings ?? []).filter((f) => !dismissed.has(f.id));
  return sortByPosition(shown, (f) => `f${f.id}`, positions).map(
    (finding, i) => ({ finding, number: i + 1 }),
  );
}

/** "No issues", "1 issue" or "N issues" */
export function issuesText(count: number): string {
  return count === 0
    ? "No issues"
    : count === 1
      ? "1 issue"
      : `${count} issues`;
}

/** A circle's accessible name, from its effective score; `suggested` is an unconfirmed AI score */
export function circleLabel(
  name: string,
  value: number | null,
  issues: number,
  suggested = false,
): string {
  if (value === null) return `${name}, not scored`;
  const label = `${name}, ${value} out of 5, ${BAND_LABEL[bandOf(value)]}, ${issuesText(issues).toLowerCase()}`;
  return suggested ? `${label}, suggested by AI` : label;
}
