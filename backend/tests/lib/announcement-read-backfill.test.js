const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { ANNOUNCEMENT_UID, ANNOUNCEMENT_READ_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let backfillAnnouncementReads;

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ backfillAnnouncementReads } = require('../../dist/src/lib/announcement-read-backfill'));
});

afterAll(async () => {
  await teardownStrapi();
});

const make = (data) =>
  strapi.documents(ANNOUNCEMENT_UID).create({
    data: { content: 'Hi.', firstCreated: new Date().toISOString(), ...data },
  });
const readsOf = (announcement) =>
  strapi.documents(ANNOUNCEMENT_READ_UID).findMany({
    filters: { announcement: { id: announcement.id } },
  });
const readAtOf = async (announcement) =>
  (await strapi.documents(ANNOUNCEMENT_UID).findOne({ documentId: announcement.documentId })).readAt;

describe('backfillAnnouncementReads', () => {
  it('turns readAt on a targeted row into a read mark for its recipient, once', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const when = new Date().toISOString();
    const system = await make({ type: 'system', authorized_user: user.documentId, readAt: when });
    const unread = await make({ type: 'system', authorized_user: user.documentId });
    const broadcast = await make({ type: 'system' });
    const friend = await make({ type: 'friend', authorized_user: user.documentId, readAt: when });

    expect(await backfillAnnouncementReads()).toBe(1);

    expect(await readsOf(system)).toHaveLength(1);
    expect(await readsOf(unread)).toHaveLength(0);
    expect(await readsOf(broadcast)).toHaveLength(0);
    expect(await readsOf(friend)).toHaveLength(0);
    expect(await readAtOf(system)).toBeNull();

    // Undo it, restart: the old mark must not come back
    for (const read of await readsOf(system)) {
      await strapi.documents(ANNOUNCEMENT_READ_UID).delete({ documentId: read.documentId });
    }
    expect(await backfillAnnouncementReads()).toBe(0);
    expect(await readsOf(system)).toHaveLength(0);
  });
});
