/*
ODY-813 step 1: scores a few droplets exactly as Score with AI (ODY-814) will,
and writes a readable report of every score and rationale to show the client.

To run, from frontend/ (after snapshot.ts):
  npx tsx --env-file=.env.local scripts/ai-review/spike.ts --droplet intro-to-git --droplet sql-basics
  npx tsx --env-file=.env.local scripts/ai-review/spike.ts --all --model claude-haiku-5-5 --effort medium

Requests go one at a time (not batched) so results arrive in minutes. It
prints the cost estimate and asks before sending anything; --yes skips that.
Output: scripts/ai-review/runs/<date>-spike-<model>-<effort>/report.md and results.json
*/
import path from "node:path";
import fs from "node:fs";
import { parseArgs } from "node:util";
import {
  loadFixtures,
  loadRubric,
  RUNS_DIR,
  runDirName,
  writeJson,
} from "./lib/files";
import {
  COMMON_OPTIONS,
  makeClient,
  metaMarkdown,
  planForEstimate,
  runMeta,
  scoreFixtures,
  settings,
} from "./lib/plan";
import { confirmSpend, runInOrder, type RequestResult } from "./lib/run";
import type { Criterion } from "@/lib/ai-review/types";

function scoreTable(result: RequestResult, criteria: Criterion[]): string {
  if (!result.parsed.ok) {
    return `_No scores: ${result.parsed.reason}${result.parsed.detail ? ` (${result.parsed.detail})` : ""}_`;
  }
  const nameOf = new Map(criteria.map((c) => [c.id, c.name]));
  return [
    "| Criterion | Score | Why |",
    "|---|:---:|---|",
    ...result.parsed.scores.map(
      (s) =>
        `| ${nameOf.get(s.criterionId)} | **${s.score}** | ${s.rationale.replace(/\|/g, "\\|").replace(/\n+/g, " ")} |`,
    ),
  ].join("\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      ...COMMON_OPTIONS,
      droplet: { type: "string", multiple: true },
      all: { type: "boolean", default: false },
    },
  });
  const { model, effort } = settings(values);
  const rubric = loadRubric();
  const wanted = new Set(values.droplet ?? []);
  const fixtures = loadFixtures().filter(
    (f) => values.all || wanted.has(f.slug),
  );
  if (!fixtures.length)
    throw new Error(
      "No fixtures chosen: pass --droplet <slug> (as saved by snapshot.ts) or --all",
    );

  const client = makeClient();
  const estimate = planForEstimate(fixtures, rubric.criteria, {
    model,
    effort,
  });
  if (
    !(await confirmSpend(estimate, model, { batch: false, yes: values.yes }))
  ) {
    console.log("Nothing sent.");
    return;
  }

  const startedAt = new Date().toISOString();
  const results = await scoreFixtures(
    fixtures,
    rubric.criteria,
    { model, effort },
    (requests) => runInOrder(client, requests, rubric.criteria, model),
  );
  const meta = runMeta(
    { model, effort, batch: false, runs: 1, startedAt },
    rubric,
    fixtures,
    results,
  );

  const sections = fixtures.map((f) => {
    const mine = results.filter((r) => r.dropletId === f.snapshot.droplet.id);
    const cost = mine.reduce((sum, r) => sum + r.costUsd, 0);
    const previous = f.snapshot.droplet.previousReview;
    return [
      `## ${f.snapshot.droplet.name}`,
      `_${f.snapshot.lessons.length} lessons, $${cost.toFixed(2)}_`,
      ...(previous
        ? [
            `**Earlier written review** (not shown to the AI):\n\n${previous.replace(/^/gm, "> ")}`,
          ]
        : []),
      ...mine.map(
        (r) =>
          `### ${r.request.kind === "overall" ? "Overall Score" : r.request.lessonName}\n\n${scoreTable(r, rubric.criteria)}`,
      ),
    ].join("\n\n");
  });

  const dir = path.join(RUNS_DIR, runDirName(`spike-${model}-${effort}`));
  writeJson(path.join(dir, "results.json"), { meta, results });
  const report = `# AI review spike\n\n${metaMarkdown(meta)}\n\n${sections.join("\n\n")}\n`;
  fs.writeFileSync(path.join(dir, "report.md"), report);

  console.log(
    `\nCost: $${meta.totals.costUsd.toFixed(2)}. Report: ${path.relative(process.cwd(), path.join(dir, "report.md"))}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
