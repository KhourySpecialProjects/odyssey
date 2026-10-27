const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  LESSON_UID,
  ENROLLMENT_UID,
  USER_UID,
  unique,
  dropletData,
  lessonData,
  userData,
  enrollmentData,
} = require('../helpers/fixtures');

const TAG_UID = 'api::tag.tag';

let strapi;
let token;
let LESSON_BLOCKS_POPULATE;
let publishEditLib;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  publishEditLib = require('../../dist/src/lib/publish-edit');
  ({ LESSON_BLOCKS_POPULATE } = publishEditLib);
});

afterAll(async () => {
  await teardownStrapi();
});

const DRAFT_GONE_MESSAGE =
  'This draft no longer exists. It may already have been published.';

const rest = () => request(strapi.server.httpServer);
const publish = (ref, body) =>
  rest()
    .post(`/api/droplets/${ref}/publish-edit`)
    .set({ Authorization: `Bearer ${token}` })
    .send(body);

const quiz = (answer) => [
  {
    __component: 'droplets.quiz',
    questions: [
      {
        content: '<p>Pick one</p>',
        answerOptions: [
          { content: answer, isCorrect: true },
          { content: 'Nope', isCorrect: false },
        ],
      },
    ],
  },
];
const v2 = (text) => [
  {
    id: 'bn-1',
    type: 'paragraph',
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  },
];

const INTRO = {
  name: 'Intro',
  orderIndex: 0,
  blocksVersion: 'v2',
  blocksV2: v2('Intro'),
};
const QUIZ = {
  name: 'Quiz',
  orderIndex: 1,
  blocksVersion: 'v1',
  blocks: quiz('Four'),
};
const WRAP = {
  name: 'Wrap up',
  orderIndex: 2,
  blocksVersion: 'v2',
  blocksV2: v2('Done'),
};
const LIVE_SPECS = [INTRO, QUIZ, WRAP];

const createLesson = (spec, overrides = {}) =>
  strapi.documents(LESSON_UID).create({
    data: lessonData({ blocksV2: undefined, ...spec, ...overrides }),
  });

/**
 * A live droplet (Intro, Quiz, Wrap up) with one enrolled user, and an [EDIT] draft of it.
 * `draftSpecs` is [spec, liveIndex | null]; null means a lesson that is new in the draft.
 */
async function setup({
  draftSpecs = LIVE_SPECS.map((spec, i) => [spec, i]),
  lineage = true,
  draftEnrollments = 1,
  draftOverrides = {},
} = {}) {
  const user = await strapi.documents(USER_UID).create({ data: userData() });
  const tagName = unique('Tag');
  const tag = await strapi.documents(TAG_UID).create({
    data: { name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, '-') },
  });
  const postreq = await strapi
    .documents(DROPLET_UID)
    .create({ data: dropletData({ status: 'published' }) });
  const prereq = await strapi
    .documents(DROPLET_UID)
    .create({ data: dropletData({ status: 'published' }) });

  const liveLessons = [];
  for (const spec of LIVE_SPECS) liveLessons.push(await createLesson(spec));
  const original = await strapi.documents(DROPLET_UID).create({
    data: dropletData({
      status: 'published',
      difficulty: 'beginner',
      lessons: liveLessons.map((l) => l.documentId),
    }),
  });
  const liveEnrollment = await strapi.documents(ENROLLMENT_UID).create({
    data: enrollmentData({
      droplet: original.documentId,
      authorizedUser: user.documentId,
      viewedLessons: [liveLessons[0].documentId, liveLessons[1].documentId],
    }),
  });

  const draftLessons = [];
  for (const [spec, liveIndex] of draftSpecs) {
    draftLessons.push(
      await createLesson(
        spec,
        lineage && liveIndex != null
          ? { originalLessonId: liveLessons[liveIndex].id }
          : {},
      ),
    );
  }
  const draft = await strapi.documents(DROPLET_UID).create({
    data: dropletData({
      name: `[EDIT] ${original.name}`,
      status: 'edit',
      difficulty: 'advanced',
      description: 'Edited description',
      originalDropletId: original.id,
      tags: [tag.documentId],
      prerequisites: [prereq.documentId],
      postrequisites: [postreq.documentId],
      lessons: draftLessons.map((l) => l.documentId),
      ...draftOverrides,
    }),
  });
  const draftEnrollmentRows = [];
  for (let i = 0; i < draftEnrollments; i++) {
    draftEnrollmentRows.push(
      await strapi.documents(ENROLLMENT_UID).create({
        data: enrollmentData({
          droplet: draft.documentId,
          authorizedUser: user.documentId,
        }),
      }),
    );
  }

  return {
    user,
    tag,
    prereq,
    postreq,
    original,
    draft,
    liveLessons,
    draftLessons,
    liveEnrollment,
    draftEnrollmentRows,
  };
}

const byId = (a, b) => a.id - b.id;
const json = (value) => JSON.parse(JSON.stringify(value));

const readDroplet = (id) =>
  strapi.documents(DROPLET_UID).findFirst({
    filters: { id },
    populate: {
      tags: { fields: ['id'] },
      prerequisites: { fields: ['id'] },
      postrequisites: { fields: ['id'] },
      learningObjectives: true,
      lessons: { sort: ['orderIndex:asc'], populate: LESSON_BLOCKS_POPULATE },
    },
  });

/** Everything the publish could touch, as plain JSON for deep-equality. */
async function snapshot({
  original,
  draft,
  draftEnrollmentRows,
  liveEnrollment,
}) {
  const enrollments = await strapi.documents(ENROLLMENT_UID).findMany({
    filters: {
      id: { $in: [liveEnrollment, ...draftEnrollmentRows].map((e) => e.id) },
    },
    populate: {
      droplet: { fields: ['id'] },
      viewedLessons: { fields: ['id'] },
    },
  });
  return json({
    original: await readDroplet(original.id),
    draft: await readDroplet(draft.id),
    enrollments: enrollments.sort(byId),
  });
}

const slugsAndIds = (lessons) =>
  lessons.map((l) => ({ id: l.id, slug: l.slug, name: l.name }));

/** Replaces strapi.db.query(uid)[method]: runs the real one, then throws. */
function failAfter(uid, method) {
  const repo = strapi.db.query(uid);
  const real = repo[method];
  const spy = jest.spyOn(repo, method).mockImplementation(async (...args) => {
    await real.apply(repo, args);
    throw new Error('forced failure');
  });
  return spy;
}

describe('POST /droplets/:id/publish-edit success', () => {
  it('syncs lessons in place, moves enrollments and removes the draft', async () => {
    const edited = { ...INTRO, blocksV2: v2('Intro, edited'), orderIndex: 1 };
    const added = {
      name: 'Extra',
      orderIndex: 2,
      blocksVersion: 'v2',
      blocksV2: v2('Extra'),
    };
    const s = await setup({
      draftSpecs: [
        [{ ...WRAP, orderIndex: 0 }, 2],
        [edited, 0],
        [added, null],
      ],
      draftEnrollments: 2,
    });
    const before = await readDroplet(s.original.id);

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      slug: s.original.slug,
      originalDropletId: s.original.id,
      lessons: { updated: 2, unchanged: 0, created: 1, deleted: 1 },
      enrollmentsMoved: 2,
    });

    const after = await readDroplet(s.original.id);
    expect(after.name).toBe(s.original.name);
    expect(after.slug).toBe(s.original.slug);
    expect(after.status).toBe('published');
    expect(after.difficulty).toBe('advanced');
    expect(after.description).toBe('Edited description');
    expect(after.tags.map((t) => t.id)).toEqual([s.tag.id]);
    expect(after.prerequisites.map((p) => p.id)).toEqual([s.prereq.id]);
    expect(after.postrequisites.map((p) => p.id)).toEqual([s.postreq.id]);

    expect(after.lessons.map((l) => l.name)).toEqual([
      'Wrap up',
      'Intro',
      'Extra',
    ]);
    const kept = (name) => before.lessons.find((l) => l.name === name);
    expect(slugsAndIds(after.lessons).slice(0, 2)).toEqual([
      { id: kept('Wrap up').id, slug: kept('Wrap up').slug, name: 'Wrap up' },
      { id: kept('Intro').id, slug: kept('Intro').slug, name: 'Intro' },
    ]);
    expect(after.lessons[1].blocksV2).toEqual(edited.blocksV2);
    expect(
      await strapi
        .documents(LESSON_UID)
        .findOne({ documentId: s.liveLessons[1].documentId }),
    ).toBeNull();

    const live = await strapi.documents(ENROLLMENT_UID).findOne({
      documentId: s.liveEnrollment.documentId,
      populate: { viewedLessons: { fields: ['id'] } },
    });
    expect(live.viewedLessons.map((l) => l.id)).toEqual([s.liveLessons[0].id]);
    const moved = await strapi.documents(ENROLLMENT_UID).findMany({
      filters: { id: { $in: s.draftEnrollmentRows.map((e) => e.id) } },
      populate: { droplet: { fields: ['id'] } },
    });
    expect(moved.map((e) => e.droplet.id)).toEqual([
      s.original.id,
      s.original.id,
    ]);

    expect(
      await strapi
        .documents(DROPLET_UID)
        .findFirst({ filters: { id: s.draft.id } }),
    ).toBeNull();
    for (const lesson of s.draftLessons) {
      expect(
        await strapi
          .documents(LESSON_UID)
          .findOne({ documentId: lesson.documentId }),
      ).toBeNull();
    }
  });

  it('leaves an unchanged v1 quiz lesson untouched, component ids included', async () => {
    const s = await setup();
    const before = await readDroplet(s.original.id);
    const quizBefore = before.lessons.find((l) => l.name === 'Quiz');
    expect(quizBefore.blocks[0].questions[0].answerOptions).toHaveLength(2);

    const res = await publish(s.draft.documentId, {
      originalDropletId: s.original.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.lessons).toEqual({
      updated: 0,
      unchanged: 3,
      created: 0,
      deleted: 0,
    });
    const quizAfter = (await readDroplet(s.original.id)).lessons.find(
      (l) => l.name === 'Quiz',
    );
    expect(json(quizAfter.blocks)).toEqual(json(quizBefore.blocks));
  });

  it('matches the lessons of a legacy draft (no lineage) by name', async () => {
    const s = await setup({ lineage: false });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    expect(res.body.data.lessons).toEqual({
      updated: 0,
      unchanged: 3,
      created: 0,
      deleted: 0,
    });
  });

  it('moves every enrollment when the draft has more than 25', async () => {
    const s = await setup({ draftEnrollments: 26 });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    expect(res.body.data.enrollmentsMoved).toBe(26);
    const onOriginal = await strapi.documents(ENROLLMENT_UID).count({
      filters: { droplet: { id: s.original.id } },
    });
    expect(onOriginal).toBe(27);
  });

  it('emits the droplet update event only after the commit', async () => {
    const s = await setup();
    const real = strapi.eventHub.emit.bind(strapi.eventHub);
    const inTx = [];
    const emit = jest
      .spyOn(strapi.eventHub, 'emit')
      .mockImplementation((name, payload) => {
        if (name === 'entry.update' && payload.model === 'droplet') {
          inTx.push(strapi.db.inTransaction());
        }
        return real(name, payload);
      });
    try {
      const res = await publish(s.draft.id, {
        originalDropletId: s.original.id,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(res.status).toBe(200);
      expect(inTx.length).toBeGreaterThan(0);
      expect(inTx.every((flag) => flag === false)).toBe(true);
    } finally {
      emit.mockRestore();
    }
  });

  it('keeps a draft lesson that is also linked to another droplet', async () => {
    const shared = {
      name: 'Shared',
      orderIndex: 3,
      blocksVersion: 'v2',
      blocksV2: v2('Shared'),
    };
    const s = await setup({
      draftSpecs: [...LIVE_SPECS.map((spec, i) => [spec, i]), [shared, null]],
    });
    const sharedDraftLesson = s.draftLessons[3];
    const other = await strapi.documents(DROPLET_UID).create({
      data: dropletData({ lessons: [sharedDraftLesson.documentId] }),
    });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    const kept = await strapi.documents(LESSON_UID).findOne({
      documentId: sharedDraftLesson.documentId,
      populate: { droplets: { fields: ['id'] } },
    });
    expect(kept.droplets.map((d) => d.id)).toEqual([other.id]);
    expect(
      await strapi
        .documents(DROPLET_UID)
        .findFirst({ filters: { id: s.draft.id } }),
    ).toBeNull();
  });
});

describe('publish-edit is all or nothing', () => {
  const addedSpec = {
    name: 'Extra',
    orderIndex: 3,
    blocksVersion: 'v2',
    blocksV2: v2('Extra'),
  };
  const withAddedLesson = () => ({
    draftSpecs: [
      ...LIVE_SPECS.map((spec, i) => [
        { ...spec, blocksV2: spec.blocksV2 && v2('changed') },
        i,
      ]),
      [addedSpec, null],
    ],
  });

  it('rolls everything back when a lesson write fails mid-sync, and emits no events', async () => {
    const s = await setup(withAddedLesson());
    const before = await snapshot(s);
    const spy = failAfter(LESSON_UID, 'create');
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    const emit = jest.spyOn(strapi.eventHub, 'emit');
    try {
      const res = await publish(s.draft.id, {
        originalDropletId: s.original.id,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe(
        'Publishing failed. Nothing was changed. Try again.',
      );
      const written = emit.mock.calls.filter(
        ([name, payload]) =>
          ['entry.update', 'entry.create'].includes(name) &&
          ['droplet', 'lesson'].includes(payload.model),
      );
      expect(written).toEqual([]);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
      emit.mockRestore();
    }

    expect(await snapshot(s)).toEqual(before);
  });

  it('rolls everything back when the last step (deleting the draft) fails', async () => {
    const s = await setup(withAddedLesson());
    const before = await snapshot(s);
    const spy = failAfter(DROPLET_UID, 'delete');
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    try {
      const res = await publish(s.draft.id, {
        originalDropletId: s.original.id,
      });

      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect(await snapshot(s)).toEqual(before);
  });

  it('answers 400 with the lesson name when Strapi rejects a lesson, and changes nothing', async () => {
    const s = await setup(withAddedLesson());
    // The draft insert bypasses validation to plant a lesson Strapi will refuse to create.
    await strapi.db.query(LESSON_UID).update({
      where: { id: s.draftLessons[3].id },
      data: { name: 'x'.repeat(101) },
    });
    const before = await snapshot(s);

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(
      /^Publishing failed \(lesson "x{101}": .+\)\. Nothing was changed\.$/,
    );
    expect(await snapshot(s)).toEqual(before);
  });
});

describe('publish-edit guards (nothing is written)', () => {
  const expectNoWrite = async (s, run) => {
    const before = await snapshot(s);
    const res = await run();
    expect(await snapshot(s)).toEqual(before);
    return res;
  };

  it('answers 404 for a draft that does not exist', async () => {
    const s = await setup();
    for (const ref of ['999999', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
      const res = await expectNoWrite(s, () =>
        publish(ref, { originalDropletId: s.original.id }),
      );
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/no longer exists/);
    }
  });

  it('answers 404 when the original does not exist', async () => {
    const s = await setup({ draftOverrides: { originalDropletId: 999999 } });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: 999999 }),
    );
    expect(res.status).toBe(404);
  });

  it('answers 409 for a draft with no originalDropletId', async () => {
    const s = await setup({ draftOverrides: { originalDropletId: null } });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(
      /not an edit of a published droplet/,
    );
  });

  it('answers 409 when the body names a different original', async () => {
    const s = await setup();
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.prereq.id }),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/made from a different droplet/);
  });

  it('answers 409 for a draft that is already published', async () => {
    const s = await setup({ draftOverrides: { status: 'published' } });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already been published/);
  });

  it('answers 409 when :id is the original itself', async () => {
    const s = await setup();
    const res = await expectNoWrite(s, () =>
      publish(s.original.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/over itself/);
  });

  it('answers 400 for a draft without a difficulty', async () => {
    const s = await setup({ draftOverrides: { difficulty: null } });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/missing a difficulty/);
  });

  it('answers 400 for an empty draft over a live droplet with lessons', async () => {
    const s = await setup({ draftSpecs: [] });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/has no lessons/);
  });

  it('answers 400 when a lesson would be left empty', async () => {
    const emptied = { ...QUIZ, blocks: [] };
    const s = await setup({
      draftSpecs: [
        [INTRO, 0],
        [emptied, 1],
        [WRAP, 2],
      ],
    });
    const res = await expectNoWrite(s, () =>
      publish(s.draft.id, { originalDropletId: s.original.id }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Lesson "Quiz" has no content/);
  });

  it.each([
    [
      'an unknown key',
      { originalDropletId: 1, extra: true },
      /Invalid key extra/,
    ],
    ['a missing originalDropletId', {}, /positive integer/],
    ['a string id', { originalDropletId: '1' }, /positive integer/],
    ['a fractional id', { originalDropletId: 1.5 }, /positive integer/],
    ['a zero id', { originalDropletId: 0 }, /positive integer/],
    [
      'an id beyond the integer range',
      { originalDropletId: 1e12 },
      /positive integer/,
    ],
    ['an array body', [1], /Body must be an object/],
  ])('answers 400 for %s', async (_label, body, message) => {
    const s = await setup();
    const res = await expectNoWrite(s, () => publish(s.draft.id, body));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(message);
  });

  it('accepts a documentId as :id and answers 404 for a path-like id', async () => {
    const s = await setup();
    const bad = await publish('..%2Fx', { originalDropletId: s.original.id });
    expect(bad.status).toBe(404);
    expect(bad.body.error.message).toBe(DRAFT_GONE_MESSAGE);
    expect(
      (await publish(s.draft.documentId, { originalDropletId: s.original.id }))
        .status,
    ).toBe(200);
  });
});

describe('publish-edit extra coverage', () => {
  it('answers 404 for a numeric :id beyond the integer range', async () => {
    const s = await setup();
    const res = await publish('99999999999', {
      originalDropletId: s.original.id,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/no longer exists/);
  });

  it('adds a lesson even when a lesson with the slug "placeholder" exists', async () => {
    const added = {
      name: 'Extra',
      orderIndex: 3,
      blocksVersion: 'v2',
      blocksV2: v2('Extra'),
    };
    const s = await setup({
      draftSpecs: [...LIVE_SPECS.map((spec, i) => [spec, i]), [added, null]],
    });
    // Created after setup and removed in finally: other fixtures reuse that slug.
    const stale = await createLesson(INTRO);
    await strapi.db
      .query(LESSON_UID)
      .update({ where: { id: stale.id }, data: { slug: 'placeholder' } });
    try {
      const res = await publish(s.draft.id, {
        originalDropletId: s.original.id,
      });

      expect(res.status).toBe(200);
      const extra = (await readDroplet(s.original.id)).lessons.find(
        (l) => l.name === 'Extra',
      );
      expect(extra.slug).toMatch(/^extra(-\d+)?$/);
    } finally {
      await strapi
        .documents(LESSON_UID)
        .delete({ documentId: stale.documentId });
    }
  });

  it('names the field when the droplet update is rejected', async () => {
    const other = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData({ status: 'published' }) });
    const s = await setup({ draftOverrides: { name: `[EDIT] ${other.name}` } });
    const before = await snapshot(s);

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(
      /^Publishing failed \(.+field: name\)\./,
    );
    expect(await snapshot(s)).toEqual(before);
  });

  it('syncs one changed quiz answer option as a single lesson update', async () => {
    const changed = { ...QUIZ, blocks: quiz('Five') };
    const s = await setup({
      draftSpecs: [
        [INTRO, 0],
        [changed, 1],
        [WRAP, 2],
      ],
    });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    expect(res.body.data.lessons).toEqual({
      updated: 1,
      unchanged: 2,
      created: 0,
      deleted: 0,
    });
    const live = (await readDroplet(s.original.id)).lessons.find(
      (l) => l.name === 'Quiz',
    );
    expect(live.blocks[0].questions[0].answerOptions[0].content).toBe('Five');
  });

  it('writes learning objectives and next steps from the draft', async () => {
    const s = await setup({
      draftOverrides: {
        learningObjectives: [{ objective: 'A new objective' }],
        nextSteps: [{ label: 'Docs', url: 'https://example.com/docs' }],
      },
    });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    const after = await strapi.documents(DROPLET_UID).findFirst({
      filters: { id: s.original.id },
      populate: { learningObjectives: true, nextSteps: true },
    });
    expect(after.learningObjectives.map((o) => o.objective)).toEqual([
      'A new objective',
    ]);
    expect(after.nextSteps.map((n) => [n.label, n.url])).toEqual([
      ['Docs', 'https://example.com/docs'],
    ]);
  });

  it('leaves the live tags alone when the draft has none', async () => {
    const s = await setup({ draftOverrides: { tags: [] } });
    await strapi.documents(DROPLET_UID).update({
      documentId: s.original.documentId,
      data: { tags: [s.tag.documentId] },
    });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    expect((await readDroplet(s.original.id)).tags.map((t) => t.id)).toEqual([
      s.tag.id,
    ]);
  });

  it('keeps a highlight on a kept lesson that was edited', async () => {
    const edited = { ...INTRO, blocksV2: v2('Intro, edited') };
    const s = await setup({
      draftSpecs: [
        [edited, 0],
        [QUIZ, 1],
        [WRAP, 2],
      ],
    });
    const highlight = await strapi
      .documents('api::highlight.highlight')
      .create({
        data: { text: 'Intro', lesson: s.liveLessons[0].documentId },
      });

    const res = await publish(s.draft.id, { originalDropletId: s.original.id });

    expect(res.status).toBe(200);
    const kept = await strapi.documents('api::highlight.highlight').findOne({
      documentId: highlight.documentId,
      populate: { lesson: { fields: ['id'] } },
    });
    expect(kept.lesson.id).toBe(s.liveLessons[0].id);
  });
});

describe('publish-edit steps outside a transaction', () => {
  it.each(['preparePublishEdit', 'applyPublishEdit', 'deleteEditDraft'])(
    '%s throws before touching anything',
    async (step) => {
      const input =
        step === 'preparePublishEdit'
          ? { draft: { id: 1 }, originalDropletId: 2 }
          : {};

      await expect(publishEditLib[step](input)).rejects.toThrow(
        new RegExp(`${step} must run inside strapi.db.transaction`),
      );
    },
  );
});

describe('concurrent publishes', () => {
  it('lets exactly one of two publishes of the same draft win', async () => {
    const s = await setup();

    const results = await Promise.allSettled([
      publish(s.draft.id, { originalDropletId: s.original.id }),
      publish(s.draft.id, { originalDropletId: s.original.id }),
    ]);

    const statuses = results.map((r) => r.value.status).sort();
    expect(statuses).toEqual([200, 404]);
    const after = await readDroplet(s.original.id);
    expect(after.lessons).toHaveLength(s.draftLessons.length);
  });
});
