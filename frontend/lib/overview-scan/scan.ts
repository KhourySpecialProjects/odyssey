import "server-only";
import { getDropletById } from "@/lib/requests/droplet";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import { CHECKS } from "@/lib/overview-scan/checks";
import { createSafeFetcher } from "@/lib/overview-scan/network";
import { runChecks } from "@/lib/overview-scan/run";
import {
  buildScanDocument,
  type ScanSourceDroplet,
  type ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";
import type { ScanResult } from "@/lib/overview-scan/types";
import type { Droplet } from "@/types";
import type { StrapiRequestParams } from "@/types/strapi";

const LINKED_FIELDS = ["name", "status", "isHidden"];

/** What the scan reads; keep in step with ScanSourceDroplet. */
export const SCAN_DROPLET_QUERY: StrapiRequestParams = {
  fields: [
    "name",
    "overview",
    "description",
    "difficulty",
    "funFact",
    "originalDropletId",
  ],
  populate: {
    tags: { fields: ["name"] },
    learningObjectives: true,
    nextSteps: true,
    prerequisites: { fields: LINKED_FIELDS },
    postrequisites: { fields: LINKED_FIELDS },
    datasets: {
      fields: ["name", "fileUrl", "rowCount"],
      sort: ["createdAt:asc"],
    },
    lessons: {
      fields: ["name", "blocksV2", "blocksVersion", "orderIndex"],
      sort: ["orderIndex:asc"],
      populate: LESSON_BLOCKS_POPULATE,
    },
  },
};

type ScanSource = ScanSourceDroplet & {
  lessons?: (ScanSourceLesson & { orderIndex?: number | null })[] | null;
};

/** Runs every registered check on the droplet as saved right now. Call only after auth and the rate limit. */
export async function scanDroplet(dropletId: number): Promise<ScanResult> {
  const droplet: ScanSource = await getDropletById<Droplet>(
    dropletId,
    SCAN_DROPLET_QUERY,
    { fresh: true },
  );
  const lessons = [...(droplet.lessons ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  const doc = buildScanDocument(droplet, lessons);
  const fetchUrl = createSafeFetcher();
  const run = await runChecks(doc, CHECKS, fetchUrl);
  return {
    rulesVersion: run.rulesVersion,
    passed: run.passed,
    needsAttention: run.needsAttention,
    couldNotCheck: run.couldNotCheck,
    results: run.results,
  };
}
