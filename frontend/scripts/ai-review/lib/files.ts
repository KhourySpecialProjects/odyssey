import fs from "node:fs";
import path from "node:path";
import type { Criterion, DropletSnapshot } from "@/lib/ai-review/types";

export const AI_REVIEW_DIR = path.resolve(process.cwd(), "scripts/ai-review");
/** AI_REVIEW_FIXTURES_DIR points the scripts at another eval set, such as a test one. */
export const FIXTURES_DIR =
  process.env.AI_REVIEW_FIXTURES_DIR ?? path.join(AI_REVIEW_DIR, "fixtures");
export const RUNS_DIR = path.join(AI_REVIEW_DIR, "runs");

export type Rubric = {
  version: string;
  source?: string;
  criteria: Criterion[];
};

/** The client's own scores for one droplet, filled in by hand (see README). */
export type ClientScores = {
  scorer: string;
  /** "holdout" droplets are never used to tune the prompt */
  split: "tune" | "holdout";
  rubricVersion: string;
  lessons: {
    lessonId: number;
    lessonName: string;
    scores: Record<string, number | null>;
  }[];
  overall: Record<string, number | null>;
  notes?: string;
};

export type Fixture = {
  slug: string;
  snapshot: DropletSnapshot;
  scores: ClientScores | null;
};

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function loadRubric(
  file = path.join(AI_REVIEW_DIR, "rubric.json"),
): Rubric {
  const rubric = readJson<Rubric>(file);
  if (!rubric.criteria?.length) throw new Error(`${file} has no criteria`);
  return rubric;
}

/** Every `<slug>.json` snapshot in the fixtures folder, with its `<slug>.scores.json` if present. */
export function loadFixtures(dir = FIXTURES_DIR): Fixture[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".scores.json"))
    .sort()
    .map((f) => {
      const slug = f.replace(/\.json$/, "");
      const scoresFile = path.join(dir, `${slug}.scores.json`);
      return {
        slug,
        snapshot: readJson<DropletSnapshot>(path.join(dir, f)),
        scores: fs.existsSync(scoresFile)
          ? readJson<ClientScores>(scoresFile)
          : null,
      };
    });
}

/** Names of the scores still blank in a client scores file. */
export function blankScores(
  scores: ClientScores,
  criteria: Criterion[],
): string[] {
  const blanks: string[] = [];
  for (const lesson of scores.lessons) {
    for (const c of criteria) {
      if (typeof lesson.scores[c.name] !== "number")
        blanks.push(`${lesson.lessonName} / ${c.name}`);
    }
  }
  for (const c of criteria) {
    if (typeof scores.overall[c.name] !== "number")
      blanks.push(`Overall / ${c.name}`);
  }
  return blanks;
}

/** A folder name for one run, such as 2026-10-28T14-05-claude-sonnet-5-5-high */
export function runDirName(label: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/:/g, "-");
  return `${stamp}-${label}`;
}
