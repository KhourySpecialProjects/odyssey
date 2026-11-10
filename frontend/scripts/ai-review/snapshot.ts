/*
Saves droplets from Strapi as fixtures for the AI review spike and eval
(ODY-813), plus a blank score sheet for the client to fill in.

To run, from frontend/:
  npx tsx --env-file=.env.local scripts/ai-review/snapshot.ts --droplet 123 --droplet intro-to-git

Reads NEXT_PUBLIC_STRAPI_API_URL and STRAPI_ACCESS_TOKEN. Never overwrites a
score sheet, and won't replace a snapshot that already has one unless --force
is given (the client's scores belong to the content as it was).
*/
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fetchDropletSnapshot } from "@/lib/ai-review/droplet-snapshot";
import type { DropletSnapshot } from "@/lib/ai-review/types";
import {
  FIXTURES_DIR,
  loadRubric,
  writeJson,
  type ClientScores,
} from "./lib/files";

function blankScoreSheet(
  snapshot: DropletSnapshot,
  rubricVersion: string,
  criteria: string[],
): ClientScores {
  const blank = Object.fromEntries(criteria.map((c) => [c, null]));
  return {
    scorer: "client",
    split: "tune",
    rubricVersion,
    lessons: snapshot.lessons.map((l) => ({
      lessonId: l.id,
      lessonName: l.name,
      scores: { ...blank },
    })),
    overall: { ...blank },
    notes: "",
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      droplet: { type: "string", multiple: true },
      force: { type: "boolean", default: false },
    },
  });
  const refs = values.droplet ?? [];
  if (!refs.length) throw new Error("Give at least one --droplet <id or slug>");
  if (!process.env.STRAPI_ACCESS_TOKEN)
    throw new Error("STRAPI_ACCESS_TOKEN is not set");
  if (!process.env.NEXT_PUBLIC_STRAPI_API_URL)
    throw new Error("NEXT_PUBLIC_STRAPI_API_URL is not set");

  const rubric = loadRubric();
  const criteria = rubric.criteria.map((c) => c.name);

  for (const ref of refs) {
    const snapshot = await fetchDropletSnapshot(
      /^\d+$/.test(ref) ? { id: Number(ref) } : { slug: ref },
    );
    if (!snapshot) {
      console.error(`No droplet found for ${ref}`);
      process.exitCode = 1;
      continue;
    }
    const file = path.join(FIXTURES_DIR, `${snapshot.droplet.slug}.json`);
    const scoresFile = path.join(
      FIXTURES_DIR,
      `${snapshot.droplet.slug}.scores.json`,
    );

    if (fs.existsSync(scoresFile) && fs.existsSync(file) && !values.force) {
      console.error(
        `${snapshot.droplet.slug} already has a score sheet; not replacing its snapshot (use --force).`,
      );
      continue;
    }
    writeJson(file, snapshot);
    console.log(
      `Saved ${path.relative(process.cwd(), file)} (${snapshot.lessons.length} lessons)`,
    );

    if (!fs.existsSync(scoresFile)) {
      writeJson(
        scoresFile,
        blankScoreSheet(snapshot, rubric.version, criteria),
      );
      console.log(
        `  and a blank score sheet: ${path.relative(process.cwd(), scoresFile)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
