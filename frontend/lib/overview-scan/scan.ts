import "server-only";
import { getDropletById } from "@/lib/requests/droplet";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import { CHECKS } from "@/lib/overview-scan/checks";
import { createSafeFetcher } from "@/lib/overview-scan/network";
import { hashScanDocument } from "@/lib/overview-scan/hash";
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
      fields: ["name", "fileUrl", "rowCount", "createdAt"],
      sort: ["createdAt:asc", "id:asc"],
    },
    lessons: {
      // slug is for the page's lesson links, not the scan document
      fields: ["name", "slug", "blocksV2", "blocksVersion", "orderIndex"],
      sort: ["orderIndex:asc", "id:asc"],
      populate: LESSON_BLOCKS_POPULATE,
    },
  },
};

type ScanSource = ScanSourceDroplet & {
  lessons?:
    | (ScanSourceLesson & {
        orderIndex?: number | null;
        slug?: string;
      })[]
    | null;
};

/** The droplet as saved right now, as the scan document and its hash (ODY-878). Call only after auth. */
export async function loadScanDocument(dropletId: number) {
  const droplet: ScanSource = await getDropletById<Droplet>(
    dropletId,
    SCAN_DROPLET_QUERY,
    { fresh: true },
  );
  // orderIndex is nullable and can tie, so id breaks ties: the same saved
  // droplet always gives the same lesson order, ids and titles
  const lessons = [...(droplet.lessons ?? [])].sort(
    (a, b) =>
      (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity) || a.id - b.id,
  );
  const doc = buildScanDocument(droplet, lessons);
  return {
    doc,
    lessons: lessons as (ScanSourceLesson & { slug?: string })[],
    contentHash: hashScanDocument(doc),
  };
}

/** Runs every registered check on the droplet as saved right now. Call only after auth and the rate limit. */
export async function scanDroplet(
  dropletId: number,
): Promise<ScanResult & { contentHash: string }> {
  const { doc, contentHash } = await loadScanDocument(dropletId);
  const fetchUrl = createSafeFetcher();
  const run = await runChecks(doc, CHECKS, fetchUrl);
  return {
    rulesVersion: run.rulesVersion,
    passed: run.passed,
    needsAttention: run.needsAttention,
    couldNotCheck: run.couldNotCheck,
    results: run.results,
    contentHash,
  };
}
