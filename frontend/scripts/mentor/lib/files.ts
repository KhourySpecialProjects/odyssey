import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DropletSnapshot } from "@/lib/ai-review/types";
import { blockNoteBlocksOf } from "@/lib/blocknote/convert-blocks";
import { mentorInputSchema } from "@/lib/validations/mentor";
import { readJson } from "@/scripts/ai-review/lib/files";

export { readJson, runDirName, writeJson } from "@/scripts/ai-review/lib/files";

// Where Mentor's eval (ODY-885) keeps its fixtures, cases and runs, and how
// it reads them. Reads no environment, so cases.ts runs without .env.local.

export const MENTOR_DIR = path.resolve(process.cwd(), "scripts/mentor");
export const FIXTURES_DIR = path.join(MENTOR_DIR, "fixtures");
export const RUNS_DIR = path.join(MENTOR_DIR, "runs");
export const CASES_FILE = path.join(MENTOR_DIR, "cases.jsonl");

export const CASE_KINDS = [
  "covered",
  "uncovered",
  "wrong-pick",
  "extraction",
  "off-topic",
  "injection",
] as const;
export type CaseKind = (typeof CASE_KINDS)[number];
export const QUIZ_KINDS: CaseKind[] = ["wrong-pick", "extraction"];

/** One line of cases.jsonl, its fields as the README describes them */
export const caseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    fixture: z.string().min(1),
    lessonId: z.number().int(),
    kind: z.enum(CASE_KINDS),
    /** Kept as mentorInputSchema parses it */
    input: mentorInputSchema,
    gold: z.array(z.string().min(1)).min(1).optional(),
    questionId: z.number().int().optional(),
    canary: z.string().min(1).optional(),
    forbidden: z.string().min(1).optional(),
    tags: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .strict();
/** A case, with its lesson's format from the fixture */
export type EvalCase = z.infer<typeof caseSchema> & {
  format: "classic" | "blocknote";
};

/** Droplet snapshots by slug */
export type Fixtures = Map<string, DropletSnapshot>;

/** Every `<slug>.json` snapshot; score sheets are skipped */
export function loadFixtures(dir = FIXTURES_DIR): Fixtures {
  if (!fs.existsSync(dir)) return new Map();
  return new Map(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".scores.json"))
      .sort()
      .map((f) => [
        f.replace(/\.json$/, ""),
        readJson<DropletSnapshot>(path.join(dir, f)),
      ]),
  );
}

const parseLine = (line: string) => {
  try {
    return caseSchema.safeParse(JSON.parse(line));
  } catch {
    return null;
  }
};

/** The cases in file order, with their lesson's format. Throws on any bad line, naming each. */
export function loadCases(fixtures: Fixtures, file = CASES_FILE): EvalCase[] {
  const bad: string[] = [];
  const cases = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, i) => {
      const parsed = line.trim() ? parseLine(line) : undefined;
      if (parsed?.success) return [parsed.data];
      const issues = parsed?.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      if (parsed !== undefined)
        bad.push(`line ${i + 1}: ${issues?.join("; ") ?? "not JSON"}`);
      return [];
    });
  if (bad.length) throw new Error(`${file}:\n${bad.join("\n")}`);
  return cases.map((c) => {
    const lesson = fixtures
      .get(c.fixture)
      ?.lessons.find((l) => l.id === c.lessonId);
    const tags = c.tags.filter((t) => t !== "classic" && t !== "blocknote");
    const blockNote = lesson && blockNoteBlocksOf(lesson);
    return { ...c, tags, format: blockNote ? "blocknote" : "classic" };
  });
}

export function appendJsonl(file: string, row: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
}

/** [] when the file doesn't exist yet */
export function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}
