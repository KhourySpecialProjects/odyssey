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
import qs from "qs";
import { flattenAttributes, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import type { DropletSnapshot, SnapshotLesson } from "@/lib/ai-review/types";
import {
  FIXTURES_DIR,
  loadRubric,
  writeJson,
  type ClientScores,
} from "./lib/files";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL ?? "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

type Objective = { objective?: string | null };
type RawLesson = SnapshotLesson & { orderIndex?: number | null };
type RawDroplet = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  type?: string | null;
  focusArea?: string | null;
  difficulty?: string | null;
  overview?: string | null;
  afterReview?: string | null;
  learningObjectives?: Objective[] | null;
  prerequisites?:
    | {
        name: string;
        description?: string | null;
        learningObjectives?: Objective[] | null;
      }[]
    | null;
  lessons?: RawLesson[] | null;
};

const objectives = (list?: Objective[] | null) =>
  (list ?? []).map((o) => o.objective?.trim()).filter((o): o is string => !!o);

async function fetchDroplet(ref: string): Promise<RawDroplet | null> {
  const query = qs.stringify(
    {
      filters: /^\d+$/.test(ref)
        ? { id: { $eq: Number(ref) } }
        : { slug: { $eq: ref } },
      fields: [
        "name",
        "slug",
        "description",
        "type",
        "focusArea",
        "difficulty",
        "overview",
        "afterReview",
      ],
      populate: {
        learningObjectives: true,
        prerequisites: {
          fields: ["name", "description"],
          populate: { learningObjectives: true },
        },
        lessons: {
          fields: ["name", "type", "blocksVersion", "blocksV2", "orderIndex"],
          sort: ["orderIndex:asc"],
          populate: LESSON_BLOCKS_POPULATE,
        },
      },
      pagination: { pageSize: 1 },
    },
    { encodeValuesOnly: true },
  );
  const res = await fetch(`${STRAPI_URL}/api/droplets?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
  });
  if (!res.ok)
    throw new Error(
      `Strapi answered ${res.status} for droplet ${ref}: ${await res.text()}`,
    );
  const rows = flattenAttributes((await res.json()).data) as RawDroplet[];
  return rows?.[0] ?? null;
}

function toSnapshot(raw: RawDroplet): DropletSnapshot {
  const lessons = [...(raw.lessons ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  return {
    snapshotVersion: 1,
    takenAt: new Date().toISOString(),
    source: { strapiUrl: STRAPI_URL, dropletId: raw.id },
    droplet: {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description ?? null,
      type: raw.type ?? null,
      focusArea: raw.focusArea ?? null,
      difficulty: raw.difficulty ?? null,
      learningObjectives: objectives(raw.learningObjectives),
      overview: raw.overview ?? null,
      prerequisites: (raw.prerequisites ?? []).map((p) => ({
        name: p.name,
        description: p.description ?? null,
        learningObjectives: objectives(p.learningObjectives),
      })),
      previousReview: raw.afterReview?.trim() || null,
    },
    lessons: lessons.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type ?? null,
      blocksVersion: l.blocksVersion ?? null,
      blocks: l.blocks ?? null,
      blocksV2: l.blocksV2 ?? null,
    })),
  };
}

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
  if (!STRAPI_TOKEN) throw new Error("STRAPI_ACCESS_TOKEN is not set");

  const rubric = loadRubric();
  const criteria = rubric.criteria.map((c) => c.name);

  for (const ref of refs) {
    const raw = await fetchDroplet(ref);
    if (!raw) {
      console.error(`No droplet found for ${ref}`);
      process.exitCode = 1;
      continue;
    }
    const snapshot = toSnapshot(raw);
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
