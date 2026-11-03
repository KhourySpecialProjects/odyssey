const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { LESSON_UID, lessonData, unique } = require('../helpers/fixtures');

let strapi;

const create = (overrides) =>
  strapi.documents(LESSON_UID).create({ data: lessonData(overrides) });
const update = (documentId, data) =>
  strapi.documents(LESSON_UID).update({ documentId, data });

const EMPTY_MESSAGE = 'Lesson must have either blocks or blocksV2 content';
const GENERIC_BLOCK = {
  __component: 'droplets.generic',
  content: 'Intro text',
};

beforeAll(async () => {
  strapi = await setupStrapi();
});

afterAll(async () => {
  await teardownStrapi();
});

describe('lesson beforeCreate', () => {
  it('sets the slug from the name when blocksV2 is present', async () => {
    const lesson = await create({ name: unique('Branching Basics') });
    expect(lesson.slug).toMatch(/^branching-basics-/);
  });

  // Characterization: a create with no content succeeds on v5. v5 fills an
  // absent dynamic zone with `blocks: []` before beforeCreate runs, and the
  // guard's `!data.blocks` treats [] as present (as it did on v4). The draft
  // editor's "Add lesson" depends on this: addLesson sends blocks: [] and no
  // blocksV2, creating a blank lesson that is filled in later. Do not tighten
  // the create guard without changing that caller.
  it('allows a create with no content (blank lesson from Add lesson)', async () => {
    const lesson = await create({ blocksV2: undefined });
    expect(lesson.slug).toBeTruthy();
  });

  it('accepts blocks without blocksV2', async () => {
    const lesson = await create({
      blocksV2: undefined,
      blocks: [GENERIC_BLOCK],
    });
    expect(lesson.slug).toBeTruthy();
  });

  // Contract: creates must send a slug (any value); beforeCreate replaces it.
  // v5 validates required fields before the hook, so omitting it is rejected.
  it('rejects a create that sends no slug', async () => {
    const { slug, ...withoutSlug } = lessonData({
      name: unique('No Slug Lesson'),
    });
    await expect(
      strapi.documents(LESSON_UID).create({ data: withoutSlug }),
    ).rejects.toThrow('slug must be defined');
  });
});

describe('lesson beforeUpdate (empty content guard)', () => {
  it('throws when blocksV2 is nulled and blocks is also empty', async () => {
    const lesson = await create();
    await expect(update(lesson.documentId, { blocksV2: null })).rejects.toThrow(
      EMPTY_MESSAGE,
    );
  });

  it('throws when blocks is emptied and blocksV2 is also empty', async () => {
    const lesson = await create({
      blocksV2: undefined,
      blocks: [GENERIC_BLOCK],
    });
    await expect(update(lesson.documentId, { blocks: [] })).rejects.toThrow(
      EMPTY_MESSAGE,
    );
  });

  it('allows emptying blocksV2 while blocks still has content', async () => {
    const lesson = await create({ blocks: [GENERIC_BLOCK] });
    const updated = await update(lesson.documentId, { blocksV2: null });
    expect(updated.blocksV2).toBeNull();
  });

  it('allows emptying blocks while blocksV2 still has content', async () => {
    const lesson = await create({ blocks: [GENERIC_BLOCK] });
    const updated = await update(lesson.documentId, { blocks: [] });
    expect(updated.documentId).toBe(lesson.documentId);
  });

  it('allows an autosave-style update with non-empty content', async () => {
    const lesson = await create();
    const blocksV2 = {
      type: 'doc',
      content: [{ type: 'paragraph', text: 'saved' }],
    };

    const updated = await update(lesson.documentId, { blocksV2 });

    expect(updated.blocksV2).toEqual(blocksV2);
  });

  it('allows updates that do not touch the content fields', async () => {
    const lesson = await create();
    const updated = await update(lesson.documentId, { type: 'setup' });
    expect(updated.type).toBe('setup');
  });
});

describe('lesson beforeUpdate (regenerateSlug)', () => {
  it('regenerates the slug from the new name when regenerateSlug is true', async () => {
    const lesson = await create();

    const updated = await update(lesson.documentId, {
      name: unique('Renamed Lesson'),
      regenerateSlug: true,
    });

    expect(updated.slug).toMatch(/^renamed-lesson-/);
    expect(updated).not.toHaveProperty('regenerateSlug');
  });

  it.each([
    ['false', { regenerateSlug: false }],
    ['missing', {}],
  ])('keeps the slug when regenerateSlug is %s', async (_label, extra) => {
    const lesson = await create();

    const updated = await update(lesson.documentId, {
      name: unique('Renamed Lesson Keep'),
      ...extra,
    });

    expect(updated.slug).toBe(lesson.slug);
  });
});

describe('lesson reserved slugs', () => {
  it.each([
    ['Scan', /^scan-lesson/],
    ['Present', /^present-lesson/],
    ['Recap', /^recap-lesson/],
  ])('create named "%s" gets a -lesson slug', async (name, pattern) => {
    const lesson = await create({ name });
    expect(lesson.slug).toMatch(pattern);
  });

  it('renaming to "Recap" with regenerateSlug gets a -lesson slug', async () => {
    const lesson = await create();
    const updated = await update(lesson.documentId, {
      name: 'Recap',
      regenerateSlug: true,
    });
    expect(updated.slug).toMatch(/^recap-lesson/);
  });

  it('a hand-set reserved slug is never stored', async () => {
    const lesson = await create();
    const updated = await update(lesson.documentId, { slug: 'scan' });
    expect(updated.slug).not.toBe('scan');
    expect(updated.slug).toMatch(/^scan-lesson/);
  });

  it.each(['scan', 'Scan'])(
    'a hand-typed slug "%s" wins over the name',
    async (slug) => {
      const lesson = await create();
      const updated = await update(lesson.documentId, { name: 'Intro', slug });
      expect(updated.slug).toMatch(/^scan-lesson/);
    },
  );

  it('regenerateSlug with a reserved name beats a hand-set slug and is not stored', async () => {
    const lesson = await create();
    const updated = await update(lesson.documentId, {
      name: 'Present',
      slug: 'scan',
      regenerateSlug: true,
    });
    expect(updated.slug).toMatch(/^present-lesson/);
    expect(updated).not.toHaveProperty('regenerateSlug');
  });

  it('leaves a normal name unchanged', async () => {
    const lesson = await create({ name: unique('Scanning Basics') });
    expect(lesson.slug).toMatch(/^scanning-basics-/);
  });
});

describe('lesson delete', () => {
  it('deletes through the document service without running create/update hooks', async () => {
    const lesson = await create();
    await strapi
      .documents(LESSON_UID)
      .delete({ documentId: lesson.documentId });
    expect(
      await strapi
        .documents(LESSON_UID)
        .findOne({ documentId: lesson.documentId }),
    ).toBeNull();
  });
});
