const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const {
  REVIEW_CRITERION_UID,
  reviewCriterionData,
} = require('../helpers/fixtures');

let strapi;
let seedReviewCriteria;
let REVIEW_CRITERIA_SEED;

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ seedReviewCriteria, REVIEW_CRITERIA_SEED } = require('../../dist/src/lib/review-criteria-seed'));
});

afterAll(async () => {
  await teardownStrapi();
});

const criteria = () => strapi.documents(REVIEW_CRITERION_UID);

describe('seedReviewCriteria', () => {
  it('seeds five active criteria on boot, in order', async () => {
    const rows = await criteria().findMany({ sort: 'order:asc' });
    expect(rows.map((r) => r.name)).toEqual([
      'Tone',
      'Style',
      'Flow',
      'Scaffolding',
      'Quality',
    ]);
    expect(rows.map((r) => r.order)).toEqual([1, 2, 3, 4, 5]);
    rows.forEach((row, i) => {
      expect(row).toMatchObject({ ...REVIEW_CRITERIA_SEED[i], active: true });
    });
  });

  it('creates nothing when run again', async () => {
    expect(await seedReviewCriteria()).toBe(0);
    expect(await criteria().count({})).toBe(5);
  });

  it('never revives an inactive criterion', async () => {
    const [flow] = await criteria().findMany({ filters: { name: 'Flow' } });
    await criteria().update({
      documentId: flow.documentId,
      data: { active: false },
    });
    expect(await seedReviewCriteria()).toBe(0);
    const after = await criteria().findOne({ documentId: flow.documentId });
    expect(after.active).toBe(false);
  });

  it('rejects a duplicate criterion name', async () => {
    await expect(
      criteria().create({
        data: reviewCriterionData({ name: 'Tone', order: 6 }),
      }),
    ).rejects.toThrow();
  });

  it('rolls back when a create fails partway, then seeds on a clean re-run', async () => {
    for (const row of await criteria().findMany({})) {
      await criteria().delete({ documentId: row.documentId });
    }
    const real = strapi.documents;
    let spy;
    let calls = 0;
    spy = jest.spyOn(strapi, 'documents', 'get').mockReturnValue((uid) => {
      const docs = real(uid);
      if (uid !== REVIEW_CRITERION_UID) return docs;
      return {
        count: (...a) => docs.count(...a),
        create: (...a) => {
          if (++calls === 3) throw new Error('boom');
          return docs.create(...a);
        },
      };
    });
    try {
      await expect(seedReviewCriteria()).rejects.toThrow('boom');
    } finally {
      spy.mockRestore();
    }
    expect(await criteria().count({})).toBe(0);
    expect(await seedReviewCriteria()).toBe(5);
    expect(await criteria().count({})).toBe(5);
  });
});
