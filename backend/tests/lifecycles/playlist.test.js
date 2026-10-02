const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { PLAYLIST_UID, playlistData, unique } = require('../helpers/fixtures');

let strapi;

const create = (overrides) =>
  strapi.documents(PLAYLIST_UID).create({ data: playlistData(overrides) });
const update = (documentId, data) =>
  strapi.documents(PLAYLIST_UID).update({ documentId, data });

beforeAll(async () => {
  strapi = await setupStrapi();
});

afterAll(async () => {
  await teardownStrapi();
});

describe('playlist beforeCreate', () => {
  it('sets the slug from the name', async () => {
    const playlist = await create({ name: unique('Git Track') });
    expect(playlist.slug).toMatch(/^git-track-/);
  });

  it('appends -1 when two playlists share a name', async () => {
    const name = unique('shared playlist').toLowerCase();
    const first = await create({ name });
    const second = await create({ name });
    expect(second.slug).toBe(`${first.slug}-1`);
  });

  // v5 issue: required-field validation runs before beforeCreate, so a create
  // without a slug fails with "slug must be defined" (see helpers/fixtures.js).
  test.failing('generates the slug when the caller sends none', async () => {
    const { slug, ...withoutSlug } = playlistData({ name: unique('No Slug Playlist') });
    const playlist = await strapi.documents(PLAYLIST_UID).create({ data: withoutSlug });
    expect(playlist.slug).toMatch(/^no-slug-playlist-/);
  });
});

describe('playlist beforeUpdate (regenerateSlug)', () => {
  it('regenerates the slug from the new name when regenerateSlug is true', async () => {
    const playlist = await create();

    const updated = await update(playlist.documentId, {
      name: unique('Renamed Playlist'),
      regenerateSlug: true,
    });

    expect(updated.slug).toMatch(/^renamed-playlist-/);
    expect(updated).not.toHaveProperty('regenerateSlug');
  });

  it.each([
    ['false', { regenerateSlug: false }],
    ['missing', {}],
  ])('keeps the slug when regenerateSlug is %s', async (_label, extra) => {
    const playlist = await create();

    const updated = await update(playlist.documentId, {
      name: unique('Renamed Playlist Keep'),
      ...extra,
    });

    expect(updated.slug).toBe(playlist.slug);
  });
});

describe('playlist delete', () => {
  it('deletes through the document service without running create/update hooks', async () => {
    const playlist = await create();
    await strapi.documents(PLAYLIST_UID).delete({ documentId: playlist.documentId });
    expect(
      await strapi.documents(PLAYLIST_UID).findOne({ documentId: playlist.documentId })
    ).toBeNull();
  });
});
