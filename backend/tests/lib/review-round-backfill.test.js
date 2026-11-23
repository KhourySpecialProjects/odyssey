const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { DROPLET_UID, dropletData } = require('../helpers/fixtures');

let strapi;
let backfillReviewRounds;

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ backfillReviewRounds } = require('../../dist/src/lib/review-round-backfill'));
});

afterAll(async () => {
  await teardownStrapi();
});

// updateMany skips the single-row lifecycles that own reviewRound.
const force = (id, data) =>
  strapi.db.transaction(() =>
    strapi.db.query(DROPLET_UID).updateMany({ where: { id }, data })
  );
const create = () => strapi.documents(DROPLET_UID).create({ data: dropletData() });
const roundOf = async (documentId) =>
  (await strapi.documents(DROPLET_UID).findOne({ documentId })).reviewRound;

describe('backfillReviewRounds', () => {
  it('sets in-review droplets below round 1 to 1 and leaves the rest', async () => {
    const zero = await create();
    const nul = await create();
    const idle = await create();
    const three = await create();
    await force(zero.id, { inReview: true, reviewRound: 0 });
    await force(nul.id, { inReview: true, reviewRound: null });
    await force(idle.id, { inReview: false, reviewRound: 0 });
    await force(three.id, { inReview: true, reviewRound: 3 });

    expect(await backfillReviewRounds()).toBe(2);

    expect(await roundOf(zero.documentId)).toBe(1);
    expect(await roundOf(nul.documentId)).toBe(1);
    expect(await roundOf(idle.documentId)).toBe(0);
    expect(await roundOf(three.documentId)).toBe(3);
  });

  it('changes nothing when run again', async () => {
    expect(await backfillReviewRounds()).toBe(0);
  });
});
