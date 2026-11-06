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
  CASES_FILE,
  loadCases,
  loadFixtures,
  readJson,
  readJsonl,
  RUNS_DIR,
  runDirName,
  writeJson,
} from "./lib/files";
import {
  ANSWER_MODES,
  ASKED,
  JUDGE,
  JUDGE_VERSION,
  judgeRequest,
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
import { cannedGroups, parseSetups, pilotCases, planGroups } from "./lib/plan";
import { ERRORS, pending, RESULTS, resumeProblems, runGroups } from "./lib/run";

const FULL_REPS = 2;
/** About a 120-word reply, to estimate the judge's cost before there is one */
const PLACEHOLDER = "word ".repeat(150);

/** report.md, after adding any rows still missing from pilot-labels.json */
function writeReport(dir: string, meta: RunMeta) {
  const file = (name: string) => path.join(dir, name);
  const rows = readJsonl<ResultRow>(file(RESULTS));
  let labels: PilotLabel[] = [];
  if (meta.pilot) {
    if (fs.existsSync(file("pilot-labels.json")))
      labels = readJson<PilotLabel[]>(file("pilot-labels.json"));
    const labelled = new Set(labels.map(keyOf));
    // Covered cases aren't judged, so there's nothing to label
    for (const r of rows) {
      if (labelled.has(keyOf(r)) || !ASKED[r.kind].length) continue;
      const { setup, caseId, rep } = r;
      const blank = Object.fromEntries(ASKED[r.kind].map((q) => [q, null]));
      labels.push({ setup, caseId, rep, writer: r.model, labels: blank });
    }
    writeJson(file("pilot-labels.json"), labels);
  }
  const errors = readJsonl<ErrorRow>(file(ERRORS));
  fs.writeFileSync(
    file("report.md"),
    `${reportMarkdown(rows, errors, meta, labels)}\n`,
  );
  console.log(`Report: ${path.relative(process.cwd(), file("report.md"))}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      setup: { type: "string", multiple: true },
      reps: { type: "string", default: String(FULL_REPS) },
      pilot: { type: "boolean", default: false },
      answers: { type: "string" },
      resume: { type: "string" },
      yes: { type: "boolean", default: false },
    },
  });
  const answers = values.answers as AnswerMode | undefined;
  if (answers && !ANSWER_MODES.includes(answers))
    throw new Error(`--answers must be one of ${ANSWER_MODES.join(", ")}`);
  const reps = Number(values.reps);
  if (!Number.isInteger(reps) || reps < 1 || reps > 3)
    throw new Error("--reps must be 1, 2 or 3");
  // Fails here, before anything is read, without a key. A resume may not need one.
  const client = values.resume ? null : makeClient({ maxRetries: 4 });

  const fixtures = loadFixtures();
  const all = loadCases(fixtures);
  const problems = validateCases(all, fixtures);
  if (problems.length)
    throw new Error(
      `${problems.length} problems in cases.jsonl: run cases.ts --check`,
    );
  const now = {
    casesSha: crypto
      .createHash("sha256")
      .update(fs.readFileSync(CASES_FILE))
      .digest("hex"),
    promptVersion: MENTOR_PROMPT_VERSION,
    judgeVersion: JUDGE_VERSION,
    fixtures: [...fixtures].map(([slug, s]) => ({ slug, takenAt: s.takenAt })),
  };

  let dir: string;
  let meta: RunMeta;
  if (values.resume) {
    // A resumed run keeps the settings it started with
    dir = values.resume;
    meta = readJson<RunMeta>(path.join(dir, "meta.json"));
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
      answers: answers ?? null,
      cases: (values.pilot ? pilotCases(all) : all).length,
      fullRun: { cases: all.length, reps: FULL_REPS },
      startedAt: new Date().toISOString(),
    };
  }

  const cases = meta.pilot ? pilotCases(all) : all;
  const groups = meta.answers
    ? cannedGroups(cases, fixtures, meta.answers)
    : planGroups(cases, fixtures, parseSetups(meta.setups), meta.reps);
  const todo = pending(groups, dir);
  if (!todo.length && !values.resume) return console.log("No cases to run.");
  if (todo.length) {
    const sender = client ?? makeClient({ maxRetries: 4 });
    const requests = todo.flat().flatMap((job) => {
      const reply = job.saved?.reply ?? PLACEHOLDER;
      const mentor = job.saved || !job.params ? [] : [job.params];
      const judged = reply && ASKED[job.facts.case.kind].length;
      return [
        ...mentor.map((params) => ({ params, outputTokens: 1000 })),
        ...(judged
          ? [{ params: judgeRequest(reply, job.facts), outputTokens: 2500 }]
          : []),
      ];
    });
    if (!(await confirmSpend(requests, { batch: false, yes: values.yes })))
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
