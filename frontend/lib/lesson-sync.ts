import isEqual from "lodash/isEqual";

/**
 * Pure planning for publishing an [EDIT] draft over a live droplet (ODY-622).
 *
 * Decides which live lessons to update in place, which draft lessons to create
 * and which live lessons to delete. It does no I/O and has no "use server"
 * directive, so it can be unit-tested and exports freely. The writes live in
 * lib/requests/droplet.ts.
 */

/** The lesson fields the planner reads. A lesson fetched with `fields: ["*"]` satisfies this. */
export type SyncableLesson = {
  id: number;
  name: string;
  type?: string | null;
  orderIndex?: number | null;
  blocksVersion?: "v1" | "v2" | null;
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
  blocksVersion?: "v1" | "v2";
  blocks?: unknown[];
  blocksV2?: unknown;
};

export type LessonSyncPlan = {
  /** Live lessons to PUT in place. `changes` has at least one field; `name` is the draft lesson's. */
  updates: {
    liveLessonId: number;
    name: string;
    changes: LessonWriteFields;
  }[];
  /** Live lesson ids that matched a draft lesson and have nothing to write. */
  unchanged: number[];
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
): Omit<T, "id"> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "id"),
  ) as Omit<T, "id">;
}

/**
 * Removes the Strapi component ids from v1 blocks so they can be sent as the
 * body of a create or update: at block level, and for quizzes also at question
 * and answer-option level.
 */
export function cleanLessonBlocks(blocks: unknown[]): unknown[] {
  if (!Array.isArray(blocks)) return [];

  return (blocks as RawBlock[]).map((block) => {
    if (block.__component === "droplets.quiz" && block.questions) {
      return {
        ...withoutId(block),
        questions: block.questions.map((question) => ({
          ...withoutId(question),
          answerOptions:
            question.answerOptions?.map((answer) => withoutId(answer)) || [],
        })),
      };
    }

    if (block.__component === "droplets.open-ended-quiz" && block.questions) {
      return {
        ...withoutId(block),
        questions: block.questions.map((question) => withoutId(question)),
      };
    }

    return withoutId(block);
  });
}

/**
 * Recursively drops every `id` key. Only used to compare v1 blocks: a clone gets
 * fresh component ids, so comparing them would make every lesson look edited.
 */
function stripIdsDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIdsDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "id")
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
  return (lesson.blocksVersion ?? "v1") === "v2" && lesson.blocksV2 != null;
}

/**
 * Pairs each draft lesson (by index into `draft`) with a live lesson, or null.
 *
 * 1. Lineage, over every draft lesson: `originalLessonId` names a live lesson
 *    that is still unclaimed. This runs to completion first, so the name pass
 *    below can never take a live lesson that a draft lesson claims by lineage.
 * 2. Exact name (trimmed), in draft order, against the live lessons nobody has
 *    claimed. This covers drafts made before lineage existed, and retries: a
 *    lesson created by a failed earlier attempt is matched, not created again.
 *
 * Position is never used. It would attach progress, notes and highlights to the
 * wrong content as soon as an author inserts, deletes or reorders a lesson.
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
): Pick<LessonWriteFields, "blocks" | "blocksV2"> {
  return usesBlocksV2(lesson)
    ? { blocksV2: lesson.blocksV2 }
    : { blocks: cleanLessonBlocks(lesson.blocks ?? []) };
}

/** Everything a new live lesson needs. The slug is not here: Strapi generates it from the name. */
function createFieldsFor(
  draft: SyncableLesson,
  orderIndex: number,
): LessonWriteFields {
  return {
    name: draft.name,
    ...(draft.type != null ? { type: draft.type } : {}),
    orderIndex,
    blocksVersion: draft.blocksVersion ?? "v1",
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

  const blocksVersion = draft.blocksVersion ?? "v1";
  if (blocksVersion !== (live.blocksVersion ?? "v1")) {
    changes.blocksVersion = blocksVersion;
  }

  // Leaving v1 content untouched matters: rewriting it recreates the dynamic-zone
  // components, and v1 highlights anchor to those component ids. v2 ids are kept.
  if (usesBlocksV2(draft)) {
    if (!isEqual(draft.blocksV2, live.blocksV2)) {
      changes.blocksV2 = draft.blocksV2;
    }
  } else if (
    !isEqual(stripIdsDeep(draft.blocks ?? []), stripIdsDeep(live.blocks ?? []))
  ) {
    changes.blocks = cleanLessonBlocks(draft.blocks ?? []);
  }

  return changes;
}

/**
 * Plans how to turn a live droplet's lessons into the draft's, keeping the
 * identity (id, slug) of every live lesson that survives.
 *
 * A draft lesson's position in `(orderIndex, id)` order is its target
 * orderIndex, 0..n-1. Matched lessons get only the fields that changed;
 * unmatched draft lessons are created; unmatched live lessons are deleted.
 * Updates, unchanged ids and creates come out in draft order, deletes in live
 * order.
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
        liveLessonId: liveLesson.id,
        name: draftLesson.name,
        changes,
      });
    } else {
      plan.unchanged.push(liveLesson.id);
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
