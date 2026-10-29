/*
ODY-813 step 3: runs the current prompt over the eval set and reports, for
each criterion, how often the AI agrees with the client.

To run, from frontend/:
  npx tsx --env-file=.env.local scripts/ai-review/eval.ts
  npx tsx --env-file=.env.local scripts/ai-review/eval.ts --model claude-haiku-5-5 --effort medium --runs 2

Uses every fixture whose score sheet is complete. Sends two Message Batches
at half price, the lessons and then the Overall Scores built from their
answers (each usually under an hour), unless --sync is given. --runs 2 runs
everything twice, to show how much the AI disagrees with itself. Droplets with
"split": "holdout" are reported separately: don't tune the prompt on them.
It prints the cost estimate and asks before sending; --yes skips that.
Output: scripts/ai-review/runs/<date>-eval-<model>-<effort>/report.md and results.json
*/
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  blankScores,
  loadFixtures,
  loadRubric,
  RUNS_DIR,
  runDirName,
  writeJson,
  type ClientScores,
  type Fixture,
} from "./lib/files";
import {
  agreementMarkdown,
  agreementTable,
  biggestGaps,
  pairScores,
  runToRunPairs,
  type Pair,
} from "./lib/metrics";
import {
  COMMON_OPTIONS,
  makeClient,
  metaMarkdown,
  planForEstimate,
  runMeta,
  scoreFixtures,
  settings,
} from "./lib/plan";
import {
  confirmSpend,
  runAsBatch,
  runInOrder,
  type RequestResult,
} from "./lib/run";
import type { Criterion } from "@/lib/ai-review/types";

function agreementSections(
  pairs: Pair[],
  criteria: Criterion[],
  title: string,
): string {
  if (!pairs.length) return "";
  const lesson = pairs.filter((p) => p.level === "lesson");
  const overall = pairs.filter((p) => p.level === "overall");
  return [
    `## ${title}`,
    `### Lessons\n\n${agreementMarkdown(agreementTable(lesson, criteria))}`,
    `### Overall Score\n\n${agreementMarkdown(agreementTable(overall, criteria))}`,
  ].join("\n\n");
}

function gapsMarkdown(pairs: Pair[]): string {
  const gaps = biggestGaps(pairs);
  if (!gaps.length) return "";
  return [
    "## Biggest gaps",
    "| Droplet | Lesson | Criterion | AI | Client | AI's reason |",
    "|---|---|---|:---:|:---:|---|",
    ...gaps.map(
      (g) =>
        `| ${g.dropletName} | ${g.lessonName} | ${g.criterion} | ${g.ai} | ${g.client} | ${g.rationale.replace(/\|/g, "\\|").replace(/\n+/g, " ")} |`,
    ),
  ].join("\n");
}

function usable(
  fixtures: Fixture[],
  criteria: Criterion[],
  rubricVersion: string,
): Fixture[] {
  return fixtures.filter((f) => {
    if (!f.scores) {
      console.warn(`Skipping ${f.slug}: no score sheet`);
      return false;
    }
    const blanks = blankScores(f.scores, criteria);
    if (blanks.length) {
      console.warn(`Skipping ${f.slug}: ${blanks.length} scores still blank`);
      return false;
    }
    if (f.scores.rubricVersion !== rubricVersion) {
      console.warn(
        `Note: ${f.slug} was scored against rubric ${f.scores.rubricVersion}, the prompt now uses ${rubricVersion}`,
      );
    }
    return true;
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      ...COMMON_OPTIONS,
      runs: { type: "string", default: "1" },
      sync: { type: "boolean", default: false },
    },
  });
  const { model, effort } = settings(values);
  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1 || runs > 3)
    throw new Error("--runs must be 1, 2 or 3");
  const batch = !values.sync;

  const rubric = loadRubric();
  const fixtures = usable(loadFixtures(), rubric.criteria, rubric.version);
  if (!fixtures.length)
    throw new Error("No fixture has a complete score sheet yet");

  const client = makeClient();
  const estimate = planForEstimate(fixtures, rubric.criteria, {
    model,
    effort,
    runs,
  });
  if (!(await confirmSpend(estimate, model, { batch, yes: values.yes }))) {
    console.log("Nothing sent.");
    return;
  }

  const startedAt = new Date().toISOString();
  const results: RequestResult[] = await scoreFixtures(
    fixtures,
    rubric.criteria,
    { model, effort, runs },
    (requests) =>
      batch
        ? runAsBatch(client, requests, rubric.criteria, model)
        : runInOrder(client, requests, rubric.criteria, model),
  );
  const meta = runMeta(
    { model, effort, batch, runs, startedAt },
    rubric,
    fixtures,
    results,
  );

  const clientScores = new Map<number, ClientScores>(
    fixtures.map((f) => [f.snapshot.droplet.id, f.scores!]),
  );
  const holdoutIds = new Set(
    fixtures
      .filter((f) => f.scores!.split === "holdout")
      .map((f) => f.snapshot.droplet.id),
  );
  const pairs = pairScores(results, clientScores, rubric.criteria);
  const tune = pairs.filter((p) => !holdoutIds.has(p.dropletId));
  const holdout = pairs.filter((p) => holdoutIds.has(p.dropletId));

  const runToRun =
    runs >= 2
      ? `## Run 1 against run 2 (the noise floor)\n\n${agreementMarkdown(
          agreementTable(
            runToRunPairs(results, rubric.criteria),
            rubric.criteria,
          ),
          ["Exact", "Within 1", "Run 2 − run 1"],
        )}`
      : "";

  const scoredPerCriterion = Math.round(
    pairs.length / runs / rubric.criteria.length,
  );
  const report = [
    "# AI review eval",
    metaMarkdown(meta),
    `_About ${scoredPerCriterion} scores per criterion. With this few, a difference of a few points between two runs is noise._`,
    agreementSections(
      tune,
      rubric.criteria,
      holdout.length ? "Tuning set" : "Agreement with the client",
    ),
    agreementSections(
      holdout,
      rubric.criteria,
      "Holdout set (don't tune on these)",
    ),
    runToRun,
    gapsMarkdown(pairs),
  ]
    .filter(Boolean)
    .join("\n\n");

  const dir = path.join(RUNS_DIR, runDirName(`eval-${model}-${effort}`));
  writeJson(path.join(dir, "results.json"), { meta, results });
  fs.writeFileSync(path.join(dir, "report.md"), `${report}\n`);
  console.log(
    `\n${report}\n\nReport: ${path.relative(process.cwd(), path.join(dir, "report.md"))}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
