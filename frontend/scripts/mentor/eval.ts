/*
Mentor's eval (ODY-885): runs the cases through each setup, grades every
answer and writes runs/<date>-mentor/report.md. See README.md for the flags
and the order to run things in. It prints a cost estimate and asks before
sending; --yes skips that.
*/
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { MENTOR_PROMPT_VERSION } from "@/lib/mentor/prompt";
import { makeClient } from "@/scripts/ai-review/lib/plan";
import { confirmSpend } from "@/scripts/ai-review/lib/run";
import { validateCases } from "./lib/cases";
import {
  CASE_KINDS,
  CASES_FILE,
  loadCases,
  loadFixtures,
  loadHandChecks,
  readJson,
  readJsonl,
  RUNS_DIR,
  runDirName,
  writeJson,
  type CaseKind,
} from "./lib/files";
import {
  ANSWER_MODES,
  JUDGE,
  JUDGE_VERSION,
  questionsFor,
  type AnswerMode,
} from "./lib/grade";
import {
  keyOf,
  reportMarkdown,
  type ErrorRow,
  type PilotLabel,
  type ResultRow,
  type RunMeta,
} from "./lib/metrics";
import { learnersSha } from "./lib/learner";
import {
  cannedGroups,
  FULL_REPS,
  parseSetups,
  pilotCases,
  planGroups,
  pricedRequests,
  runCases,
  runSettings,
} from "./lib/plan";
import { ERRORS, pending, RESULTS, resumeProblems, runGroups } from "./lib/run";

/** report.md, after adding any rows still missing from pilot-labels.json */
function writeReport(dir: string, meta: RunMeta) {
  const file = (name: string) => path.join(dir, name);
  const rows = readJsonl<ResultRow>(file(RESULTS));
  let labels: PilotLabel[] = [];
  if (meta.pilot) {
    if (fs.existsSync(file("pilot-labels.json")))
      labels = readJson<PilotLabel[]>(file("pilot-labels.json"));
    const labelled = new Set(labels.map(keyOf));
    // Covered cases without a learner aren't judged: nothing to label
    for (const r of rows) {
      const asked = questionsFor(r.kind, !!r.learner);
      if (labelled.has(keyOf(r)) || !asked.length) continue;
      const { setup, caseId, rep } = r;
      const blank = Object.fromEntries(asked.map((q) => [q, null]));
      labels.push({ setup, caseId, rep, writer: r.model, labels: blank });
    }
    writeJson(file("pilot-labels.json"), labels);
  }
  const errors = readJsonl<ErrorRow>(file(ERRORS));
  fs.writeFileSync(
    file("report.md"),
    `${reportMarkdown(rows, errors, meta, labels, loadHandChecks(dir))}\n`,
  );
  console.log(`Report: ${path.relative(process.cwd(), file("report.md"))}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      setup: { type: "string", multiple: true },
      reps: { type: "string", default: String(FULL_REPS) },
      pilot: { type: "boolean", default: false },
      kind: { type: "string", multiple: true },
      answers: { type: "string" },
      twins: { type: "string" },
      kind: { type: "string", multiple: true },
      resume: { type: "string" },
      yes: { type: "boolean", default: false },
    },
  });
  const answers = values.answers as AnswerMode | undefined;
  if (answers && !ANSWER_MODES.includes(answers))
    throw new Error(`--answers must be one of ${ANSWER_MODES.join(", ")}`);
  const kinds = (values.kind ?? []) as CaseKind[];
  for (const kind of kinds)
    if (!CASE_KINDS.includes(kind))
      throw new Error(`Unknown kind ${kind}: use ${CASE_KINDS.join(", ")}`);
  const reps = Number(values.reps);
  if (!Number.isInteger(reps) || reps < 1 || reps > 3)
    throw new Error("--reps must be 1, 2 or 3");
  // Fails here, before anything is read, without a key. A resume may not need one.
  const client = values.resume ? null : makeClient({ maxRetries: 4 });

  const fixtures = loadFixtures();
  const base = loadCases(fixtures);
  const problems = validateCases(base, fixtures);
  if (problems.length)
    throw new Error(
      `${problems.length} problems in cases.jsonl: run cases.ts --check`,
    );
  // A resume keeps the twins and kinds it started with unless a flag says otherwise
  const started = values.resume
    ? readJson<RunMeta>(path.join(values.resume, "meta.json"))
    : null;
  const { twins, kinds } = runSettings(values, started);
  const all = runCases(base, twins, kinds);
  const now = {
    twins,
    kinds,
    casesSha: crypto
      .createHash("sha256")
      .update(fs.readFileSync(CASES_FILE))
      .digest("hex"),
    learnersSha: learnersSha(all),
    promptVersion: MENTOR_PROMPT_VERSION,
    judgeVersion: JUDGE_VERSION,
    fixtures: [...fixtures].map(([slug, s]) => ({ slug, takenAt: s.takenAt })),
  };

  let dir: string;
  let meta: RunMeta;
  if (values.resume) {
    // A resumed run keeps the settings it started with
    dir = values.resume;
    meta = started!;
    const changed = resumeProblems(meta, now);
    if (changed.length)
      throw new Error(
        `${changed.join(", ")} changed since ${dir} started: start a new run`,
      );
  } else {
    dir = path.join(RUNS_DIR, runDirName("mentor"));
    if (fs.existsSync(dir))
      throw new Error(`${dir} exists: wait a minute and run again`);
    meta = {
      ...now,
      judge: JUDGE,
      setups: answers ? [`answers-${answers}`] : parseSetups(values.setup),
      reps: answers ? 1 : reps,
      pilot: values.pilot,
      kinds: kinds.length ? kinds : null,
      answers: answers ?? null,
      cases: runCases(all, { pilot: values.pilot, kinds }).length,
      fullRun: { cases: all.length, reps: FULL_REPS },
      startedAt: new Date().toISOString(),
    };
  }

  const cases = runCases(all, meta);
  const groups = meta.answers
    ? cannedGroups(cases, fixtures, meta.answers)
    : planGroups(cases, fixtures, parseSetups(meta.setups), meta.reps);
  const todo = pending(groups, dir);
  if (!todo.length && !values.resume) return console.log("No cases to run.");
  if (todo.length) {
    const sender = client ?? makeClient({ maxRetries: 4 });
    if (
      !(await confirmSpend(pricedRequests(todo), {
        batch: false,
        yes: values.yes,
      }))
    )
      return console.log("Nothing sent.");
    if (!values.resume) writeJson(path.join(dir, "meta.json"), meta);
    console.log(`Writing to ${path.relative(process.cwd(), dir)}`);
    await runGroups(sender, todo, dir);
  }
  writeReport(dir, meta);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
