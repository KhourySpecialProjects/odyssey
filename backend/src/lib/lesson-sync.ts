import { isDeepStrictEqual } from 'node:util';

/** Pure planner for publishing an [EDIT] draft over a live droplet (ODY-622, ported from the frontend). */

/** The lesson fields the planner reads. A lesson fetched with `fields: ["*"]` satisfies this. */
export type SyncableLesson = {
  id: number;
  name: string;
  type?: string | null;
  orderIndex?: number | null;
  blocksVersion?: 'v1' | 'v2' | null;
  blocks?: unknown[] | null;
  blocksV2?: unknown;
  /** [EDIT]-draft lessons only: id of the live lesson this was cloned from. */
  originalLessonId?: number | null;
};

/** The only fields a plan ever writes. Slug, relations, lineage and lock fields never appear. */
export type LessonWriteFields = {
  name?: string;
  type?: string;
  orderIndex?: number;
  blocksVersion?: 'v1' | 'v2';
  blocks?: unknown[];
  blocksV2?: unknown;
};

export type LessonSyncPlan = {
  /** Live lessons to update in place. `changes` has at least one field. */
  updates: {
    draftLessonId: number;
    liveLessonId: number;
    name: string;
    changes: LessonWriteFields;
  }[];
  /** Matched lessons with nothing to write. */
  unchanged: { draftLessonId: number; liveLessonId: number }[];
  /** Draft lessons with no live counterpart, to POST. */
  creates: {
    draftLessonId: number;
    name: string;
    data: LessonWriteFields;
  }[];
  /** Live lessons that are no longer in the draft. */
  deletes: { liveLessonId: number; name: string }[];
};

type RawAnswerOption = { id?: unknown; [key: string]: unknown };
type RawQuestion = {
  id?: unknown;
  answerOptions?: RawAnswerOption[];
  [key: string]: unknown;
};
type RawBlock = {
  id?: unknown;
  __component?: string;
  questions?: RawQuestion[];
  [key: string]: unknown;
};

/** A shallow copy of `record` without its `id` key. */
function withoutId<T extends Record<string, unknown>>(
  record: T,
): Omit<T, 'id'> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== 'id'),
  ) as Omit<T, 'id'>;
}

/** Strips component ids from v1 blocks (block, question and answer-option level) for a write. */
export function cleanLessonBlocks(blocks: unknown[]): unknown[] {
  if (!Array.isArray(blocks)) return [];

  return (blocks as RawBlock[]).map((block) => {
    if (block.__component === 'droplets.quiz' && block.questions) {
      return {
        ...withoutId(block),
        questions: block.questions.map((question) => ({
          ...withoutId(question),
          answerOptions:
            question.answerOptions?.map((answer) => withoutId(answer)) || [],
        })),
      };
    }

    if (block.__component === 'droplets.open-ended-quiz' && block.questions) {
      return {
        ...withoutId(block),
        questions: block.questions.map((question) => withoutId(question)),
      };
    }

    return withoutId(block);
  });
}

/** Drops every `id` key recursively; clones get fresh component ids, so v1 comparison ignores them. */
function stripIdsDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIdsDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'id')
        .map(([key, nested]) => [key, stripIdsDeep(nested)]),
    );
  }
  return value;
}

/** Reading order: orderIndex (a missing one counts as 0), then id. */
function byOrder(a: SyncableLesson, b: SyncableLesson): number {
  return (a.orderIndex ?? 0) - (b.orderIndex ?? 0) || a.id - b.id;
}

/** A v2 lesson takes its content from blocksV2 only when it has some; anything else uses blocks. */
function usesBlocksV2(lesson: SyncableLesson): boolean {
  return (lesson.blocksVersion ?? 'v1') === 'v2' && lesson.blocksV2 != null;
}

/**
 * Pairs each draft lesson (by index) with a live lesson or null: lineage first, then exact name.
 * Never by position, which would attach progress to the wrong content.
 */
function matchLessons(
  draft: SyncableLesson[],
  live: SyncableLesson[],
): (SyncableLesson | null)[] {
  const liveById = new Map(live.map((lesson) => [lesson.id, lesson]));
  const claimed = new Set<number>();
  const matches: (SyncableLesson | null)[] = draft.map(() => null);

  draft.forEach((lesson, i) => {
    const candidate =
      lesson.originalLessonId != null
        ? liveById.get(lesson.originalLessonId)
        : undefined;
    if (candidate && !claimed.has(candidate.id)) {
      claimed.add(candidate.id);
      matches[i] = candidate;
    }
  });

  draft.forEach((lesson, i) => {
    if (matches[i]) return;
    const name = lesson.name.trim();
    const candidate = live.find(
      (liveLesson) =>
        !claimed.has(liveLesson.id) && liveLesson.name.trim() === name,
    );
    if (candidate) {
      claimed.add(candidate.id);
      matches[i] = candidate;
    }
  });

  return matches;
}

/** The content half of a write: blocksV2 for a v2 lesson that has it, otherwise cleaned blocks. */
function contentOf(
  lesson: SyncableLesson,
): Pick<LessonWriteFields, 'blocks' | 'blocksV2'> {
  return usesBlocksV2(lesson)
    ? { blocksV2: lesson.blocksV2 }
    : { blocks: cleanLessonBlocks(lesson.blocks ?? []) };
}

/** Everything a new live lesson needs, except the slug. */
function createFieldsFor(
  draft: SyncableLesson,
  orderIndex: number,
): LessonWriteFields {
  return {
    name: draft.name,
    ...(draft.type != null ? { type: draft.type } : {}),
    orderIndex,
    blocksVersion: draft.blocksVersion ?? 'v1',
    ...contentOf(draft),
  };
}

/** Only the fields where the draft lesson differs from its matched live lesson. */
function changesFor(
  draft: SyncableLesson,
  live: SyncableLesson,
  orderIndex: number,
): LessonWriteFields {
  const changes: LessonWriteFields = {};

  if (draft.name !== live.name) changes.name = draft.name;
  if (draft.type != null && draft.type !== live.type) changes.type = draft.type;
  if (live.orderIndex !== orderIndex) changes.orderIndex = orderIndex;

  const blocksVersion = draft.blocksVersion ?? 'v1';
  if (blocksVersion !== (live.blocksVersion ?? 'v1')) {
    changes.blocksVersion = blocksVersion;
  }

  // Unchanged v1 content is never rewritten: v1 highlights anchor to its component ids.
  if (usesBlocksV2(draft)) {
    if (!isDeepStrictEqual(draft.blocksV2, live.blocksV2)) {
      changes.blocksV2 = draft.blocksV2;
    }
  } else if (
    !isDeepStrictEqual(
      stripIdsDeep(draft.blocks ?? []),
      stripIdsDeep(live.blocks ?? []),
    )
  ) {
    changes.blocks = cleanLessonBlocks(draft.blocks ?? []);
  }

  return changes;
}

/**
 * Plans how to turn the live lessons into the draft's, keeping the id and slug of survivors.
 * A draft lesson's position in (orderIndex, id) order is its target orderIndex.
 */
export function planLessonSync(
  draftLessons: SyncableLesson[],
  liveLessons: SyncableLesson[],
): LessonSyncPlan {
  const draft = [...draftLessons].sort(byOrder);
  const live = [...liveLessons].sort(byOrder);
  const matches = matchLessons(draft, live);

  const plan: LessonSyncPlan = {
    updates: [],
    unchanged: [],
    creates: [],
    deletes: [],
  };

  draft.forEach((draftLesson, orderIndex) => {
    const liveLesson = matches[orderIndex];

    if (!liveLesson) {
      plan.creates.push({
        draftLessonId: draftLesson.id,
        name: draftLesson.name,
        data: createFieldsFor(draftLesson, orderIndex),
      });
      return;
    }

    const changes = changesFor(draftLesson, liveLesson, orderIndex);
    if (Object.keys(changes).length > 0) {
      plan.updates.push({
        draftLessonId: draftLesson.id,
        liveLessonId: liveLesson.id,
        name: draftLesson.name,
        changes,
      });
    } else {
      plan.unchanged.push({
        draftLessonId: draftLesson.id,
        liveLessonId: liveLesson.id,
      });
    }
  });

  const matchedIds = new Set(
    matches.filter((m): m is SyncableLesson => m !== null).map((m) => m.id),
  );
  plan.deletes = live
    .filter((liveLesson) => !matchedIds.has(liveLesson.id))
    .map((liveLesson) => ({
      liveLessonId: liveLesson.id,
      name: liveLesson.name,
    }));

  return plan;
}
