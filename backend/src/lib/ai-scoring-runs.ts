import {
  loadAiScoringSettings,
  lockAiScoringSettings,
} from './ai-scoring-settings';
import { runCostUsd, spendThisMonthUsd, type RunUsage } from './ai-scoring-spend';
import {
  findScore,
  lockOpenReview,
  lockReview,
  ReviewScoreError,
  scoreKey,
} from './review-scores';

const RUN_UID = 'api::ai-scoring-run.ai-scoring-run';
const SCORE_UID = 'api::review-score.review-score';
const CRITERION_UID = 'api::review-criterion.review-criterion';
const LESSON_UID = 'api::lesson.lesson';

const RUN_FIELDS = [
  'runState',
  'model',
  'promptVersion',
  'startedAt',
  'finishedAt',
  'updatedAt',
];

/**
 * A queued or running run with no progress for this long is dead: ECS can
 * restart a task mid-run. The run reports progress after every lesson, so a
 * long droplet doesn't trip it.
 */
export const STALE_RUN_MS = 10 * 60 * 1000;

export const STALE_RUN_MESSAGE = 'Stopped: no progress for 10 minutes.';
export const REVIEW_CLOSED_MESSAGE =
  'The review was sent before scoring finished.';

const ACTIVE_STATES = ['queued', 'running'];

type Row = Record<string, any>;

export type CriterionSnapshot = {
  id: number;
  name: string;
  lessonDescription: string;
  overallDescription: string;
  order: number;
};

export type RunSummary = {
  id: number;
  documentId: string;
  runState: string;
  startedAt: string | null;
  finishedAt: string | null;
};

const pickRun = (row: Row): RunSummary => ({
  id: row.id,
  documentId: row.documentId,
  runState: row.runState,
  startedAt: row.startedAt ?? null,
  finishedAt: row.finishedAt ?? null,
});

export type StartRunInput = {
  reviewId: number;
  userId: number;
  model: string;
  promptVersion: string;
};

export type StartRunResult = {
  dropletId: number;
  run: RunSummary;
  criteria: CriterionSnapshot[];
};

/**
 * Refuses once this month's spend, plus what runs still going may yet spend,
 * reaches the monthly cap (ODY-815). A run's tokens count only as it reports
 * them, so each queued or running run holds back the rest of its per-run
 * ceiling; a dead one (no progress for 10 minutes) holds back nothing. The
 * settings row lock makes starts on different reviews check one at a time, so
 * two can't both pass at the edge. A cap of $0 turns Score with AI off.
 */
async function checkMonthlyBudget(): Promise<void> {
  const { monthlyCapUsd, perRunCapUsd, prices } = await lockAiScoringSettings();
  const active = (await strapi.documents(RUN_UID).findMany({
    filters: {
      runState: { $in: ACTIVE_STATES },
      updatedAt: { $gte: new Date(Date.now() - STALE_RUN_MS).toISOString() },
    },
    fields: ['model', 'inputTokens', 'outputTokens'],
  } as any)) as RunUsage[];
  const heldBack = active.reduce(
    (sum, run) => sum + Math.max(0, perRunCapUsd - runCostUsd(run, prices)),
    0,
  );
  if ((await spendThisMonthUsd(prices)) + heldBack >= monthlyCapUsd) {
    throw new ReviewScoreError(
      409,
      "This month's Score with AI budget is used up",
    );
  }
}

/**
 * Starts Score with AI on a review, one run at a time. Under the review's row
 * lock it marks dead runs failed, refuses while another is queued or running,
 * checks the monthly budget, then creates the run with the active criteria it
 * will score. Two starts on one review wait on the review lock, so only one
 * creates a run; starts on different reviews wait on the settings lock for
 * the budget check.
 */
export async function startRun(input: StartRunInput): Promise<StartRunResult> {
  return strapi.db.transaction(async () => {
    const review = await lockOpenReview({
      reviewId: input.reviewId,
      lessonId: null,
      userId: input.userId,
    });
    // Withdrawing leaves the review open, but the author can edit again.
    if (review.droplet.inReview !== true) {
      throw new ReviewScoreError(409, 'This droplet is not in review');
    }

    const active = (await strapi.documents(RUN_UID).findMany({
      filters: {
        review: { id: input.reviewId },
        runState: { $in: ACTIVE_STATES },
      },
      fields: RUN_FIELDS,
    } as any)) as Row[];
    const cutoff = Date.now() - STALE_RUN_MS;
    let busy = false;
    for (const run of active) {
      if (new Date(run.updatedAt).getTime() < cutoff) {
        await strapi.documents(RUN_UID).update({
          documentId: run.documentId,
          data: {
            runState: 'failed',
            error: STALE_RUN_MESSAGE,
            finishedAt: new Date(),
          },
        } as any);
      } else {
        busy = true;
      }
    }
    if (busy) {
      throw new ReviewScoreError(
        409,
        'Score with AI is already running for this review',
      );
    }

    const criteria = (
      (await strapi.documents(CRITERION_UID).findMany({
        filters: { active: true },
        sort: ['order:asc'],
        fields: ['name', 'lessonDescription', 'overallDescription', 'order'],
      })) as Row[]
    ).map((c) => ({
      id: c.id,
      name: c.name,
      lessonDescription: c.lessonDescription,
      overallDescription: c.overallDescription,
      order: c.order,
    }));
    if (!criteria.length) {
      throw new ReviewScoreError(409, 'There are no active criteria to score');
    }
    await checkMonthlyBudget();

    const run = await strapi.documents(RUN_UID).create({
      data: {
        review: review.documentId,
        runState: 'queued',
        model: input.model,
        promptVersion: input.promptVersion,
        criteria,
      },
      fields: RUN_FIELDS,
    } as any);

    return {
      dropletId: Number(review.droplet.id),
      run: pickRun(run as Row),
      criteria,
    };
  });
}

/**
 * Locks the run's review and checks the caller is its reviewer. Returns the
 * run (with its review id and criteria) and the review. Must run inside a
 * transaction.
 */
async function lockRun(
  runId: number,
  userId: number,
): Promise<{ run: Row; review: Row }> {
  const found = (await strapi.documents(RUN_UID).findFirst({
    filters: { id: runId },
    fields: ['id'],
    populate: { review: { fields: ['id'] } },
  } as any)) as Row | null;
  if (!found?.review) throw new ReviewScoreError(404, 'Run not found');

  const review = await lockReview(Number(found.review.id));
  if (review.reviewer?.id !== userId) {
    throw new ReviewScoreError(403, 'Only the reviewer can score this review');
  }
  // Re-read under the lock: a start may have just marked it failed.
  const run = (await strapi.documents(RUN_UID).findFirst({
    filters: { id: runId },
    fields: [...RUN_FIELDS, 'criteria'],
  } as any)) as Row;
  if (!ACTIVE_STATES.includes(run.runState)) {
    throw new ReviewScoreError(409, 'This run has already ended');
  }
  return { run, review };
}

/** Rows of `uid` with these ids (and `filters`), by id. */
async function byId(
  uid: string,
  ids: number[],
  filters: Row = {},
): Promise<Map<number, Row>> {
  if (!ids.length) return new Map();
  const rows = (await strapi.documents(uid as any).findMany({
    filters: { id: { $in: ids }, ...filters },
    fields: ['id'],
  } as any)) as Row[];
  return new Map(rows.map((r) => [r.id, r]));
}

async function endRun(run: Row, data: Row): Promise<Row> {
  return (await strapi.documents(RUN_UID).update({
    documentId: run.documentId,
    data: { ...data, finishedAt: new Date() },
    fields: RUN_FIELDS,
  } as any)) as Row;
}

export type RunRef = { runId: number; userId: number };

/** Tokens used so far, so a run cut short still records what it spent. */
export type RunTokens = { inputTokens: number; outputTokens: number };

export type HeartbeatInput = RunRef & RunTokens;

export type HeartbeatResult = {
  dropletId: number;
  run: RunSummary;
  /** The run has spent its per-run ceiling and should stop (ODY-815) */
  overCeiling: boolean;
};

/**
 * Marks the run `running` (setting `startedAt` the first time) and records
 * progress and tokens so far, so a start doesn't take it for dead. A review
 * sent meanwhile ends the run as failed instead. Past the per-run ceiling it
 * says so but leaves the run going: ending it here would make `finish` refuse
 * and lose the lessons already scored, so the run stops and saves them.
 */
export async function heartbeatRun(
  input: HeartbeatInput,
): Promise<HeartbeatResult> {
  return strapi.db.transaction(async () => {
    const { run, review } = await lockRun(input.runId, input.userId);
    const dropletId = Number(review.droplet.id);
    const tokens = {
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    };
    const { perRunCapUsd, prices } = await loadAiScoringSettings();
    const overCeiling =
      runCostUsd({ model: run.model, ...tokens }, prices) >= perRunCapUsd;
    if (review.state !== 'open') {
      const ended = await endRun(run, {
        ...tokens,
        runState: 'failed',
        error: REVIEW_CLOSED_MESSAGE,
      });
      return { dropletId, run: pickRun(ended), overCeiling };
    }
    const updated = await strapi.documents(RUN_UID).update({
      documentId: run.documentId,
      data: {
        ...tokens,
        runState: 'running',
        startedAt: run.startedAt ?? new Date(),
      },
      fields: RUN_FIELDS,
    } as any);
    return { dropletId, run: pickRun(updated as Row), overCeiling };
  });
}

export type RunScore = {
  lessonId: number | null;
  criterionId: number;
  aiValue: number;
  aiRationale: string;
};

export type FinishRunInput = RunRef &
  RunTokens & {
    runState: 'done' | 'partial' | 'failed';
    failedLessons: number[];
    error: string | null;
    scores: RunScore[];
  };

export type FinishRunResult = {
  dropletId: number;
  run: RunSummary;
  /** Suggestions written */
  saved: number;
  /** Suggestions skipped because the reviewer had already set that score */
  kept: number;
  /** Suggestions dropped because their lesson left the droplet mid-run */
  dropped: number;
};

/**
 * Saves a run's suggestions and ends it, in one transaction. Writes only
 * `aiValue` and `aiRationale`, and skips any score the reviewer has already
 * set, so running again replaces unconfirmed suggestions only. A lesson that
 * left the droplet mid-run loses only its own suggestions. A review sent
 * meanwhile ends the run as failed and saves nothing.
 */
export async function finishRun(
  input: FinishRunInput,
): Promise<FinishRunResult> {
  return strapi.db.transaction(async () => {
    const { run, review } = await lockRun(input.runId, input.userId);
    const dropletId = Number(review.droplet.id);
    if (review.state !== 'open') {
      const ended = await endRun(run, {
        runState: 'failed',
        error: REVIEW_CLOSED_MESSAGE,
      });
      return { dropletId, run: pickRun(ended), saved: 0, kept: 0, dropped: 0 };
    }

    const snapshot = new Map<number, CriterionSnapshot>(
      ((run.criteria ?? []) as CriterionSnapshot[]).map((c) => [c.id, c]),
    );
    const criterionIds = [...new Set(input.scores.map((s) => s.criterionId))];
    const unknown = criterionIds.find((id) => !snapshot.has(id));
    if (unknown !== undefined) {
      throw new ReviewScoreError(400, `Criterion ${unknown} is not in this run`);
    }
    const criteria = await byId(CRITERION_UID, criterionIds);

    const lessonIds = [
      ...new Set(
        input.scores
          .map((s) => s.lessonId)
          .filter((id): id is number => id !== null),
      ),
    ];
    const lessons = await byId(LESSON_UID, lessonIds, {
      droplets: { id: dropletId },
    });

    let saved = 0;
    let kept = 0;
    let dropped = 0;
    for (const score of input.scores) {
      const criterion = criteria.get(score.criterionId);
      const lesson =
        score.lessonId === null ? null : lessons.get(score.lessonId);
      // Deleted since the run started, or the lesson left the droplet:
      // nothing to attach the suggestion to.
      if (!criterion || lesson === undefined) {
        dropped++;
        continue;
      }
      const key = scoreKey(review.id, score.lessonId, score.criterionId);
      const existing = await findScore(key);
      if (existing && existing.value !== null && existing.value !== undefined) {
        kept++;
        continue;
      }
      const ai = { aiValue: score.aiValue, aiRationale: score.aiRationale };
      if (existing) {
        await strapi
          .documents(SCORE_UID)
          .update({ documentId: existing.documentId, data: ai } as any);
      } else {
        await strapi.documents(SCORE_UID).create({
          data: {
            key,
            ...ai,
            criterionName: snapshot.get(score.criterionId)!.name,
            review: review.documentId,
            criterion: criterion.documentId,
            ...(lesson ? { lesson: lesson.documentId } : {}),
          },
        } as any);
      }
      saved++;
    }

    const ended = await endRun(run, {
      runState: input.runState,
      failedLessons: input.failedLessons,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      error: input.error,
    });
    return { dropletId, run: pickRun(ended), saved, kept, dropped };
  });
}
