/*
The judge bake-off (ODY-941): the replies Brady labelled in a pilot, judged
again by each candidate judge, to see which agrees with him best. It prints a
cost estimate and asks before sending; --yes skips that. It writes
<run>/<stamp>-bakeoff.jsonl and .md, which are gitignored like the runs.

  npx tsx --env-file=.env.local scripts/mentor/judge-bakeoff.ts \
    --run scripts/mentor/runs/<pilot dir> [--judge sonnet-high ...]
*/
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { makeClient } from "@/scripts/ai-review/lib/plan";
import { confirmSpend } from "@/scripts/ai-review/lib/run";
import {
  bakeoffMarkdown,
  CANDIDATES,
  labelled,
  type BakeoffRow,
  type CandidateName,
} from "./lib/bakeoff";
import { factsFor, type CaseFacts } from "./lib/cases";
import {
  appendJsonl,
  CASES_FILE,
  loadCases,
  loadFixtures,
  readJson,
  readJsonl,
  runDirName,
} from "./lib/files";
import { JUDGE_VERSION, judgeRequest } from "./lib/grade";
import type { PilotLabel, ResultRow, RunMeta } from "./lib/metrics";
import { judgeOnce, RESULTS } from "./lib/run";

const AT_ONCE = 4;
/** A generous guess: the judge wrote about 71 tokens a call at medium */
const OUTPUT_GUESS = 1000;

async function main() {
  const { values } = parseArgs({
    options: {
      run: { type: "string" },
      judge: { type: "string", multiple: true },
      yes: { type: "boolean", default: false },
    },
  });
  if (!values.run) throw new Error("--run <pilot run folder> is required");
  const known = Object.keys(CANDIDATES);
  const names = values.judge?.length ? values.judge : known;
  const unknown = names.filter((n) => !known.includes(n));
  if (unknown.length)
    throw new Error(
      `Unknown judge ${unknown.join(", ")}: use ${known.join(", ")}`,
    );

  const file = (name: string) => path.join(values.run!, name);
  if (!fs.existsSync(file("pilot-labels.json")))
    throw new Error(`${values.run} has no pilot-labels.json`);
  const meta = readJson<RunMeta>(file("meta.json"));
  const rows = readJsonl<ResultRow>(file(RESULTS));
  const labels = readJson<PilotLabel[]>(file("pilot-labels.json"));

  // Replies are judged against today's cases and fixtures, so say what moved
  const fixtures = loadFixtures();
  const cases = new Map(loadCases(fixtures).map((c) => [c.id, c]));
  const casesSha = crypto
    .createHash("sha256")
    .update(fs.readFileSync(CASES_FILE))
    .digest("hex");
  if (casesSha !== meta.casesSha)
    console.warn("cases.jsonl has changed since this run.");
  const moved = meta.fixtures.filter(
    (f) => fixtures.get(f.slug)?.takenAt !== f.takenAt,
  );
  if (moved.length)
    console.warn(
      `Fixtures changed since this run: ${moved.map((f) => f.slug).join(", ")}`,
    );

  const jobs: { row: ResultRow; facts: CaseFacts }[] = [];
  for (const row of labelled(rows, labels)) {
    const c = cases.get(row.caseId);
    if (!c || c.kind !== row.kind) {
      const why = c ? "its kind has changed" : "it's no longer in cases.jsonl";
      console.warn(`Skipped ${row.caseId}: ${why}`);
      continue;
    }
    jobs.push({ row, facts: factsFor(c, fixtures) });
  }
  if (!jobs.length) return console.log("No labelled replies to judge.");

  const work = names.flatMap((name) =>
    jobs.map((job) => ({ ...job, name: name as CandidateName })),
  );
  console.log(`${jobs.length} labelled replies, ${names.length} judges.`);
  const requests = work.map((w) => ({
    params: judgeRequest(w.row.reply, w.facts, CANDIDATES[w.name]),
    outputTokens: OUTPUT_GUESS,
  }));
  if (!(await confirmSpend(requests, { batch: false, yes: values.yes })))
    return console.log("Nothing sent.");

  // Made only now, so a run without a key still gets as far as the estimate
  const client = makeClient({ maxRetries: 4 });
  const base = runDirName("bakeoff");
  const results: BakeoffRow[] = [];
  let [next, done] = [0, 0];
  const worker = async () => {
    while (next < work.length) {
      const { row, facts, name } = work[next++];
      const judged = await judgeOnce(
        client,
        row.reply,
        facts,
        CANDIDATES[name],
      );
      const key = {
        candidate: name,
        setup: row.setup,
        caseId: row.caseId,
        rep: row.rep,
      };
      const result: BakeoffRow = judged.ok
        ? { ...key, ...judged.judged, costUsd: judged.costUsd }
        : { ...key, error: judged.detail };
      appendJsonl(file(`${base}.jsonl`), result);
      results.push(result);
      const outcome = judged.ok ? "judged" : judged.detail;
      console.log(
        `  [${++done}/${work.length}] ${name} ${row.caseId}: ${outcome}`,
      );
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  // The answers already on file, for free, then each judge in the order asked
  const recorded: BakeoffRow[] = jobs.flatMap(({ row }) =>
    row.judge
      ? [
          {
            candidate: `recorded (judge ${meta.judgeVersion})`,
            setup: row.setup,
            caseId: row.caseId,
            rep: row.rep,
            answers: row.judge.answers,
            badQuotes: row.judge.badQuotes,
            costUsd: row.judge.costUsd,
          },
        ]
      : [],
  );
  const ordered = [
    ...recorded,
    ...names.flatMap((n) => results.filter((r) => r.candidate === n)),
  ];
  const report = bakeoffMarkdown(ordered, labels);
  fs.writeFileSync(file(`${base}.md`), `${report}\n`);
  console.log(`\n${report}\n`);
  if (meta.judgeVersion !== JUDGE_VERSION)
    console.log(
      `Labels were made against judge ${meta.judgeVersion}'s questions; candidates are asked today's (${JUDGE_VERSION}).`,
    );
  console.log(`Report: ${path.relative(process.cwd(), file(`${base}.md`))}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
