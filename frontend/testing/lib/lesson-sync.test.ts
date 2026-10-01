import { cleanLessonBlocks, planLessonSync } from "@/lib/lesson-sync";
import type { SyncableLesson } from "@/lib/lesson-sync";
import type { Lesson } from "@/types";

type Block = Record<string, unknown>;

/** v1 text block. `id` is the Strapi component id, which differs between a lesson and its clone. */
const genericBlock = (content: string, id: number): Block => ({
  id,
  __component: "droplets.generic",
  content,
});

/** v1 quiz block with ids at block, question and answer-option level (`base` .. `base + 3`). */
const quizBlock = (rightAnswer: string, base: number): Block => ({
  id: base,
  __component: "droplets.quiz",
  questions: [
    {
      id: base + 1,
      content: "<p>Pick one</p>",
      answerOptions: [
        { id: base + 2, isCorrect: true, content: rightAnswer },
        { id: base + 3, isCorrect: false, content: "Nope" },
      ],
    },
  ],
});

/** v2 (BlockNote) paragraph. BlockNote ids are strings, and v2 highlights anchor to them. */
const paragraph = (id: string, text: string): Block => ({
  id,
  type: "paragraph",
  content: [{ type: "text", text, styles: {} }],
  children: [],
});

/**
 * Three lessons shaped like Strapi's response: a plain v1 lesson, a v1 quiz and a v2 lesson.
 * `base` shifts every row id and component id, so `makeLessons(200)` is a clone of
 * `makeLessons(100)` with identical content and fresh ids.
 */
function makeLessons(base: number): SyncableLesson[] {
  return [
    {
      id: base + 1,
      name: "Intro",
      type: "general",
      orderIndex: 0,
      blocksVersion: "v1",
      blocks: [genericBlock("Welcome", base + 10)],
    },
    {
      id: base + 2,
      name: "Quiz",
      type: "activity",
      orderIndex: 1,
      blocksVersion: "v1",
      blocks: [quizBlock("Four", base + 20)],
    },
    {
      id: base + 3,
      name: "Wrap up",
      type: "general",
      orderIndex: 2,
      blocksVersion: "v2",
      blocks: [],
      blocksV2: [paragraph("bn-wrap", "Done")],
    },
  ];
}

/** A draft as `duplicateDroplet` builds it: a clone of `live` that records its lineage. */
function cloneWithLineage(live: SyncableLesson[]): SyncableLesson[] {
  return makeLessons(200).map((lesson, i) => ({
    ...lesson,
    originalLessonId: live[i].id,
  }));
}

describe("cleanLessonBlocks", () => {
  it("drops ids at block, question and answer-option level on quiz blocks", () => {
    expect(cleanLessonBlocks([quizBlock("Four", 10)])).toStrictEqual([
      {
        __component: "droplets.quiz",
        questions: [
          {
            content: "<p>Pick one</p>",
            answerOptions: [
              { isCorrect: true, content: "Four" },
              { isCorrect: false, content: "Nope" },
            ],
          },
        ],
      },
    ]);
  });

  it("gives a quiz question without answerOptions an empty list", () => {
    expect(
      cleanLessonBlocks([
        {
          id: 1,
          __component: "droplets.quiz",
          questions: [{ id: 2, content: "Q" }],
        },
      ]),
    ).toStrictEqual([
      {
        __component: "droplets.quiz",
        questions: [{ content: "Q", answerOptions: [] }],
      },
    ]);
  });

  it("drops ids at block and question level on open-ended quizzes", () => {
    expect(
      cleanLessonBlocks([
        {
          id: 1,
          __component: "droplets.open-ended-quiz",
          questions: [{ id: 2, content: "Why?", correctAnswer: "Because" }],
        },
      ]),
    ).toStrictEqual([
      {
        __component: "droplets.open-ended-quiz",
        questions: [{ content: "Why?", correctAnswer: "Because" }],
      },
    ]);
  });

  it("drops only the block id on other components", () => {
    expect(
      cleanLessonBlocks([
        genericBlock("Hi", 5),
        { id: 6, __component: "droplets.callout", title: "Note", content: "x" },
      ]),
    ).toStrictEqual([
      { __component: "droplets.generic", content: "Hi" },
      { __component: "droplets.callout", title: "Note", content: "x" },
    ]);
  });

  it("keeps a quiz block that has no questions, minus its id", () => {
    expect(
      cleanLessonBlocks([{ id: 1, __component: "droplets.quiz" }]),
    ).toStrictEqual([{ __component: "droplets.quiz" }]);
  });

  it("returns an empty list for anything that is not an array", () => {
    expect(cleanLessonBlocks(null as unknown as unknown[])).toEqual([]);
    expect(cleanLessonBlocks(undefined as unknown as unknown[])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const blocks = [quizBlock("Four", 10)];
    const snapshot = JSON.parse(JSON.stringify(blocks));

    cleanLessonBlocks(blocks);

    expect(blocks).toEqual(snapshot);
  });
});

describe("planLessonSync", () => {
  const live = makeLessons(100); // ids 101, 102, 103
  const clone = () => cloneWithLineage(live); // ids 201, 202, 203
  // The same draft as an [EDIT] draft made before lineage existed: no originalLessonId at all
  const legacyClone = () => makeLessons(200);

  describe("when nothing changed", () => {
    it("plans no writes for an identical clone with lineage", () => {
      expect(planLessonSync(clone(), live)).toEqual({
        updates: [],
        unchanged: [101, 102, 103],
        creates: [],
        deletes: [],
      });
    });

    it("ignores component ids when v1 content is otherwise the same", () => {
      const draft = clone();
      // sanity: the clone really does carry different ids at every level
      expect(draft[1].blocks).not.toEqual(live[1].blocks);

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([]);
      expect(plan.unchanged).toContain(102);
    });

    it("does not mutate either input", () => {
      const draft = clone();
      draft.reverse();
      const snapshot = JSON.stringify([draft, live]);

      planLessonSync(draft, live);

      expect(JSON.stringify([draft, live])).toBe(snapshot);
    });
  });

  describe("field-level changes", () => {
    it("sends only blocksV2 when a v2 lesson's content changes", () => {
      const draft = clone();
      const edited = [paragraph("bn-wrap", "Done, and edited")];
      draft[2] = { ...draft[2], blocksV2: edited };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        { liveLessonId: 103, name: "Wrap up", changes: { blocksV2: edited } },
      ]);
      expect(plan.unchanged).toEqual([101, 102]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("treats a changed BlockNote block id as a v2 content change", () => {
      const draft = clone();
      const reIded = [paragraph("bn-other", "Done")];
      draft[2] = { ...draft[2], blocksV2: reIded };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        { liveLessonId: 103, name: "Wrap up", changes: { blocksV2: reIded } },
      ]);
    });

    it("sends cleaned blocks, with no ids at any level, when v1 content changes", () => {
      const draft = clone();
      draft[1] = { ...draft[1], blocks: [quizBlock("Five", 520)] };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        {
          liveLessonId: 102,
          name: "Quiz",
          changes: {
            blocks: [
              {
                __component: "droplets.quiz",
                questions: [
                  {
                    content: "<p>Pick one</p>",
                    answerOptions: [
                      { isCorrect: true, content: "Five" },
                      { isCorrect: false, content: "Nope" },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ]);
      expect(plan.unchanged).toEqual([101, 103]);
    });

    it("sends only the name for a rename", () => {
      const draft = clone();
      draft[0] = { ...draft[0], name: "Welcome" };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        { liveLessonId: 101, name: "Welcome", changes: { name: "Welcome" } },
      ]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("sends only the type for a type change", () => {
      const draft = clone();
      draft[1] = { ...draft[1], type: "setup" };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        { liveLessonId: 102, name: "Quiz", changes: { type: "setup" } },
      ]);
    });

    it("sends blocksVersion and blocksV2 when a lesson switches from v1 to v2", () => {
      const draft = clone();
      const converted = [paragraph("bn-intro", "Welcome")];
      draft[0] = {
        ...draft[0],
        blocksVersion: "v2",
        blocks: [],
        blocksV2: converted,
      };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        {
          liveLessonId: 101,
          name: "Intro",
          changes: { blocksVersion: "v2", blocksV2: converted },
        },
      ]);
    });

    it("never sends a type the draft does not have", () => {
      const draft = clone();
      draft[1] = { ...draft[1], type: null };
      draft[2] = { ...draft[2], type: undefined };

      expect(planLessonSync(draft, live)).toEqual({
        updates: [],
        unchanged: [101, 102, 103],
        creates: [],
        deletes: [],
      });
    });

    it("treats a missing blocksVersion as v1 on either side", () => {
      const liveLessons: SyncableLesson[] = [
        { id: 101, name: "A", orderIndex: 0, blocksVersion: "v1", blocks: [] },
        { id: 102, name: "B", orderIndex: 1, blocks: [] },
        { id: 103, name: "C", orderIndex: 2, blocksVersion: null, blocks: [] },
      ];
      const draft: SyncableLesson[] = [
        // blocksVersion missing on the draft side, "v1" live
        {
          id: 201,
          name: "A",
          orderIndex: 0,
          blocks: [],
          originalLessonId: 101,
        },
        // missing live, "v1" on the draft side
        {
          id: 202,
          name: "B",
          orderIndex: 1,
          blocksVersion: "v1",
          blocks: [],
          originalLessonId: 102,
        },
        // null live, "v1" on the draft side
        {
          id: 203,
          name: "C",
          orderIndex: 2,
          blocksVersion: "v1",
          blocks: [],
          originalLessonId: 103,
        },
      ];

      expect(planLessonSync(draft, liveLessons)).toEqual({
        updates: [],
        unchanged: [101, 102, 103],
        creates: [],
        deletes: [],
      });
    });

    it("treats a v2 lesson with null or missing blocksV2 as v1 content", () => {
      const draft: SyncableLesson[] = [
        {
          id: 301,
          name: "Odd",
          type: "general",
          orderIndex: 0,
          blocksVersion: "v2",
          blocksV2: null,
          blocks: [genericBlock("Fallback", 1)],
        },
        {
          id: 302,
          name: "Odder",
          type: "general",
          orderIndex: 1,
          blocksVersion: "v2",
          blocks: [genericBlock("Fallback too", 2)],
        },
      ];

      const { creates } = planLessonSync(draft, []);

      expect(creates.map((c) => c.data)).toStrictEqual([
        {
          name: "Odd",
          type: "general",
          orderIndex: 0,
          blocksVersion: "v2",
          blocks: [{ __component: "droplets.generic", content: "Fallback" }],
        },
        {
          name: "Odder",
          type: "general",
          orderIndex: 1,
          blocksVersion: "v2",
          blocks: [
            { __component: "droplets.generic", content: "Fallback too" },
          ],
        },
      ]);
    });
  });

  describe("order and structure", () => {
    it("sends only orderIndex when lessons are reordered, keeping every id", () => {
      const draft = clone();
      draft[1] = { ...draft[1], orderIndex: 0 }; // Quiz first
      draft[0] = { ...draft[0], orderIndex: 1 }; // Intro second

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([
        { liveLessonId: 102, name: "Quiz", changes: { orderIndex: 0 } },
        { liveLessonId: 101, name: "Intro", changes: { orderIndex: 1 } },
      ]);
      expect(plan.unchanged).toEqual([103]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("creates an inserted lesson at its position and renumbers the ones after it", () => {
      const draft = clone();
      const inserted: SyncableLesson = {
        id: 250,
        name: "Extra",
        type: "general",
        orderIndex: 1,
        blocksVersion: "v1",
        blocks: [genericBlock("Extra body", 77)],
      };
      draft[1] = { ...draft[1], orderIndex: 2 };
      draft[2] = { ...draft[2], orderIndex: 3 };
      draft.push(inserted);

      const plan = planLessonSync(draft, live);

      expect(plan.creates).toEqual([
        {
          draftLessonId: 250,
          name: "Extra",
          data: {
            name: "Extra",
            type: "general",
            orderIndex: 1,
            blocksVersion: "v1",
            blocks: [
              { __component: "droplets.generic", content: "Extra body" },
            ],
          },
        },
      ]);
      expect(plan.updates).toEqual([
        { liveLessonId: 102, name: "Quiz", changes: { orderIndex: 2 } },
        { liveLessonId: 103, name: "Wrap up", changes: { orderIndex: 3 } },
      ]);
      expect(plan.unchanged).toEqual([101]);
      expect(plan.deletes).toEqual([]);
    });

    it("renumbers orderIndex from position, so gaps in the draft do not leak into live", () => {
      const draft = clone();
      draft[0] = { ...draft[0], orderIndex: 10 };
      draft[1] = { ...draft[1], orderIndex: 20 };
      draft[2] = { ...draft[2], orderIndex: 30 };

      const plan = planLessonSync(draft, live);

      expect(plan.updates).toEqual([]);
      expect(plan.unchanged).toEqual([101, 102, 103]);
    });

    it("deletes a lesson that was removed from the draft", () => {
      const draft = clone().filter((l) => l.name !== "Quiz");
      draft[1] = { ...draft[1], orderIndex: 1 }; // Wrap up moves up

      const plan = planLessonSync(draft, live);

      expect(plan.deletes).toEqual([{ liveLessonId: 102, name: "Quiz" }]);
      expect(plan.updates).toEqual([
        { liveLessonId: 103, name: "Wrap up", changes: { orderIndex: 1 } },
      ]);
      expect(plan.unchanged).toEqual([101]);
      expect(plan.creates).toEqual([]);
    });

    it("sorts by orderIndex then id, treating a missing orderIndex as 0", () => {
      const draft: SyncableLesson[] = [
        { id: 9, name: "Nine", orderIndex: undefined, blocks: [] },
        { id: 5, name: "Five", orderIndex: null, blocks: [] },
        { id: 4, name: "Four", orderIndex: 0, blocks: [] },
        { id: 1, name: "Last", orderIndex: 5, blocks: [] },
      ];

      const { creates } = planLessonSync(draft, []);

      expect(creates.map((c) => [c.draftLessonId, c.data.orderIndex])).toEqual([
        [4, 0],
        [5, 1],
        [9, 2],
        [1, 3],
      ]);
    });
  });

  describe("matching a draft lesson to a live lesson", () => {
    it("matches a legacy draft (no lineage) by exact name", () => {
      const draft = legacyClone();

      expect(planLessonSync(draft, live)).toEqual({
        updates: [],
        unchanged: [101, 102, 103],
        creates: [],
        deletes: [],
      });
    });

    it("turns a renamed lesson in a legacy draft into a create plus a delete", () => {
      const draft = legacyClone();
      draft[1] = { ...draft[1], name: "Quiz time" };

      const plan = planLessonSync(draft, live);

      expect(plan.creates).toHaveLength(1);
      expect(plan.creates[0]).toMatchObject({
        draftLessonId: 202,
        name: "Quiz time",
        data: { name: "Quiz time", orderIndex: 1 },
      });
      expect(plan.deletes).toEqual([{ liveLessonId: 102, name: "Quiz" }]);
      expect(plan.updates).toEqual([]);
      expect(plan.unchanged).toEqual([101, 103]);
    });

    it("ignores surrounding whitespace when matching names", () => {
      const draft = legacyClone();
      draft[0] = { ...draft[0], name: "  Intro " };

      const plan = planLessonSync(draft, live);

      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("lets lineage beat name when a lineage lesson was renamed to another live lesson's name", () => {
      const twoLive: SyncableLesson[] = [
        { id: 101, name: "Alpha", orderIndex: 0, blocks: [] },
        { id: 102, name: "Beta", orderIndex: 1, blocks: [] },
      ];
      const draft: SyncableLesson[] = [
        // renamed Alpha -> Beta, so by name it looks like live 102
        {
          id: 201,
          name: "Beta",
          orderIndex: 0,
          blocks: [],
          originalLessonId: 101,
        },
        {
          id: 202,
          name: "Beta",
          orderIndex: 1,
          blocks: [],
          originalLessonId: 102,
        },
      ];

      const plan = planLessonSync(draft, twoLive);

      expect(plan.updates).toEqual([
        { liveLessonId: 101, name: "Beta", changes: { name: "Beta" } },
      ]);
      expect(plan.unchanged).toEqual([102]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("falls back to name when lineage points at a missing live lesson", () => {
      const draft = clone();
      draft[1] = { ...draft[1], originalLessonId: 999 };

      const plan = planLessonSync(draft, live);

      expect(plan.unchanged).toEqual([101, 102, 103]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("creates the lesson when lineage is missing and the name matches nothing", () => {
      const draft = clone();
      draft[1] = { ...draft[1], name: "Brand new", originalLessonId: 999 };

      const plan = planLessonSync(draft, live);

      expect(plan.creates.map((c) => c.draftLessonId)).toEqual([202]);
      expect(plan.deletes).toEqual([{ liveLessonId: 102, name: "Quiz" }]);
    });

    it("lets the first draft lesson claim a duplicated lineage id, and the second falls to the name pass", () => {
      const draft = clone();
      // both claim live 101; the second is really the Quiz lesson
      draft[1] = { ...draft[1], originalLessonId: 101 };

      const plan = planLessonSync(draft, live);

      expect(plan.unchanged).toEqual([101, 102, 103]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("creates the second lesson with a duplicated lineage id when no name matches", () => {
      const draft = clone();
      draft[1] = { ...draft[1], name: "Copy", originalLessonId: 101 };

      const plan = planLessonSync(draft, live);

      expect(plan.unchanged).toEqual([101, 103]);
      expect(plan.creates.map((c) => c.draftLessonId)).toEqual([202]);
      expect(plan.deletes).toEqual([{ liveLessonId: 102, name: "Quiz" }]);
    });

    it("matches duplicate names in order", () => {
      const mk = (id: number, order: number, text: string): SyncableLesson => ({
        id,
        name: "Same",
        orderIndex: order,
        blocksVersion: "v1",
        blocks: [genericBlock(text, id)],
      });
      const twoLive = [mk(101, 0, "first"), mk(102, 1, "second")];
      const draft = [mk(201, 0, "first"), mk(202, 1, "second, edited")];

      const plan = planLessonSync(draft, twoLive);

      expect(plan.unchanged).toEqual([101]);
      expect(plan.updates).toEqual([
        {
          liveLessonId: 102,
          name: "Same",
          changes: {
            blocks: [
              { __component: "droplets.generic", content: "second, edited" },
            ],
          },
        },
      ]);
      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it("matches a lesson left by a failed earlier publish by name instead of creating it again", () => {
      const created: SyncableLesson = {
        id: 150,
        name: "New",
        type: "general",
        orderIndex: 3,
        blocksVersion: "v1",
        blocks: [genericBlock("New body", 1500)],
      };
      // the failed attempt already created "New" in the live droplet
      const liveAfterFailure = [...live, created];
      // the draft's "New" has no lineage: it was never in the live droplet
      const draft = [
        ...clone(),
        { ...created, id: 260, blocks: [genericBlock("New body", 2600)] },
      ];

      const plan = planLessonSync(draft, liveAfterFailure);

      expect(plan.creates).toEqual([]);
      expect(plan.deletes).toEqual([]);
      expect(plan.updates).toEqual([]);
      expect(plan.unchanged).toEqual([101, 102, 103, 150]);
    });
  });

  describe("empty inputs", () => {
    it("deletes every live lesson when the draft is empty", () => {
      expect(planLessonSync([], live)).toEqual({
        updates: [],
        unchanged: [],
        creates: [],
        deletes: [
          { liveLessonId: 101, name: "Intro" },
          { liveLessonId: 102, name: "Quiz" },
          { liveLessonId: 103, name: "Wrap up" },
        ],
      });
    });

    it("creates everything when the live droplet is empty", () => {
      const plan = planLessonSync(clone(), []);

      expect(plan.updates).toEqual([]);
      expect(plan.unchanged).toEqual([]);
      expect(plan.deletes).toEqual([]);
      expect(plan.creates.map((c) => [c.draftLessonId, c.name])).toEqual([
        [201, "Intro"],
        [202, "Quiz"],
        [203, "Wrap up"],
      ]);
      expect(plan.creates.map((c) => c.data.orderIndex)).toEqual([0, 1, 2]);
    });

    it("returns an empty plan for two empty lists", () => {
      expect(planLessonSync([], [])).toEqual({
        updates: [],
        unchanged: [],
        creates: [],
        deletes: [],
      });
    });
  });

  describe("write payloads", () => {
    const ALLOWED = [
      "name",
      "type",
      "orderIndex",
      "blocksVersion",
      "blocks",
      "blocksV2",
    ];

    /** A lesson as Strapi returns it with `fields: ["*"]` and relations populated. */
    const withExtras = (lesson: SyncableLesson): SyncableLesson =>
      ({
        ...lesson,
        slug: "some-slug",
        notes: "a note",
        droplets: [{ id: 1 }],
        enrollments: [{ id: 2 }],
        highlights: [{ id: 3 }],
        lockedBy: { id: 4 },
        lockedAt: "2025-01-01T00:00:00.000Z",
        regenerateSlug: true,
      }) as SyncableLesson;

    it("never puts slug, notes, relations, lock fields or originalLessonId in a write", () => {
      const draft = clone().map(withExtras);
      draft[0] = { ...draft[0], name: "Welcome" }; // -> update
      draft.push(
        withExtras({
          id: 250,
          name: "Extra",
          type: "general",
          orderIndex: 3,
          blocksVersion: "v1",
          blocks: [genericBlock("Extra body", 1)],
        }),
      ); // -> create

      const plan = planLessonSync(draft, live.map(withExtras));

      expect(plan.updates).toHaveLength(1);
      expect(plan.creates).toHaveLength(1);
      const writes = [
        ...plan.updates.map((u) => u.changes),
        ...plan.creates.map((c) => c.data),
      ];
      for (const write of writes) {
        expect(Object.keys(write).filter((k) => !ALLOWED.includes(k))).toEqual(
          [],
        );
      }
    });

    it("sends a full create payload: name, type, orderIndex, blocksVersion and content", () => {
      const { creates } = planLessonSync(clone(), []);

      expect(creates.map((c) => Object.keys(c.data).sort())).toEqual([
        ["blocks", "blocksVersion", "name", "orderIndex", "type"],
        ["blocks", "blocksVersion", "name", "orderIndex", "type"],
        ["blocksV2", "blocksVersion", "name", "orderIndex", "type"],
      ]);
    });

    it("omits type from a create when the draft lesson has none", () => {
      const draft: SyncableLesson[] = [
        { id: 1, name: "Typeless", orderIndex: 0, blocks: [] },
      ];

      const { creates } = planLessonSync(draft, []);

      expect(creates[0].data).toStrictEqual({
        name: "Typeless",
        orderIndex: 0,
        blocksVersion: "v1",
        blocks: [],
      });
    });
  });

  describe("input types", () => {
    it("accepts the app's Lesson type without casts", () => {
      // publishDraftToOriginal passes `droplet.lessons` straight in. This only
      // compiles (tsc / next build) while Lesson is assignable to SyncableLesson.
      const lessons: Lesson[] = [];

      expect(planLessonSync(lessons, lessons)).toEqual({
        updates: [],
        unchanged: [],
        creates: [],
        deletes: [],
      });
    });
  });
});
