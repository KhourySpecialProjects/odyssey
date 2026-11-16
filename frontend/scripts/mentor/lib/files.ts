import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DropletSnapshot } from "@/lib/ai-review/types";
import { blockNoteBlocksOf } from "@/lib/blocknote/convert-blocks";
import { mentorInputSchema } from "@/lib/validations/mentor";
import { readJson } from "@/scripts/ai-review/lib/files";
import type { LearnerContext } from "./learner";

export { readJson, runDirName, writeJson } from "@/scripts/ai-review/lib/files";

// Where Mentor's eval (ODY-885) keeps its fixtures, cases and runs, and how
// it reads them. Reads no environment, so cases.ts runs without .env.local.

export const MENTOR_DIR = path.resolve(process.cwd(), "scripts/mentor");
export const FIXTURES_DIR = path.join(MENTOR_DIR, "fixtures");
export const RUNS_DIR = path.join(MENTOR_DIR, "runs");
export const CASES_FILE = path.join(MENTOR_DIR, "cases.jsonl");
/** Named learner profiles (ODY-941), each a `<name>.json` */
export const LEARNERS_DIR = path.join(FIXTURES_DIR, "learners");

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

/** No < or >, so a profile can't open or close a tag of the prompt */
const plain = z
  .string()
  .min(1)
  .regex(/^[^<>]+$/, "no < or >");

/** A learner profile: ODY-934's LearnerContext, plus a note for cases.md that's never sent */
export const learnerSchema = z
  .object({
    finished: z
      .array(
        z
          .object({
            name: plain,
            tags: z.array(plain),
            difficulty: plain.nullable(),
            month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM"),
          })
          .strict(),
      )
      .max(15)
      .refine(
        (rows) => rows.every((r, i) => !i || r.month <= rows[i - 1].month),
        "newest first",
      ),
    inProgress: z
      .array(
        z
          .object({
            name: plain,
            viewed: z.number().int().min(0),
            total: z.number().int().min(1),
          })
          .strict(),
      )
      .max(5),
    prerequisites: z.array(
      z.object({ name: plain, finished: z.boolean() }).strict(),
    ),
    viewedLessons: z.array(plain),
    about: plain.optional(),
  })
  .strict() satisfies z.ZodType<LearnerContext & { about?: string }>;
export type LearnerProfile = z.infer<typeof learnerSchema>;

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
    /** A profile's name in fixtures/learners, or a profile written out */
    learner: z
      .union([z.string().regex(/^[a-z0-9-]+$/), learnerSchema])
      .optional(),
    tags: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .strict();
/** A case, with its lesson's format from the fixture and its learner's profile */
export type EvalCase = z.infer<typeof caseSchema> & {
  format: "classic" | "blocknote";
  /** Null with no learner, or a name with no profile (prepareCase reports that) */
  profile: LearnerProfile | null;
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

/** Every `<name>.json` profile; none when there's no directory. Throws on a bad file, naming each. */
export function loadLearners(dir = LEARNERS_DIR): Map<string, LearnerProfile> {
  if (!fs.existsSync(dir)) return new Map();
  const bad: string[] = [];
  const profiles = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => {
      const parsed = learnerSchema.safeParse(readJson(path.join(dir, f)));
      if (parsed.success)
        return [[f.replace(/\.json$/, ""), parsed.data] as const];
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      bad.push(`${f}: ${issues.join("; ")}`);
      return [];
    });
  if (bad.length) throw new Error(`${dir}:\n${bad.join("\n")}`);
  return new Map(profiles);
}

/** The cases in file order, with their lesson's format and learner profile. Throws on any bad line, naming each. */
export function loadCases(
  fixtures: Fixtures,
  file = CASES_FILE,
  learners = loadLearners(),
): EvalCase[] {
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
    const profile =
      typeof c.learner === "string"
        ? learners.get(c.learner) ?? null
        : c.learner ?? null;
    return { ...c, tags, format: blockNote ? "blocknote" : "classic", profile };
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
