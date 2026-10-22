// Minimal valid payloads, based on the required fields in each schema.json.
// Names must be unique per test because Droplet.name and the emails are unique.

let counter = 0;
const unique = (label) => `${label} ${Date.now().toString(36)}-${++counter}`;

// Strapi v5 validates required fields BEFORE the beforeCreate hook runs, so a
// create without a slug is rejected ("slug must be defined") even though the
// hook would generate one. Fixtures send a placeholder, which the hook
// overwrites (generateSlug ignores data.slug and slugifies the name). The
// lifecycle tests assert the missing-slug rejection as the contract.
const SLUG_PLACEHOLDER = 'placeholder';

const DROPLET_UID ='api::droplet.droplet';
const LESSON_UID = 'api::lesson.lesson';
const PLAYLIST_UID = 'api::playlist.playlist';
const CREATION_REQUEST_UID = 'api::creation-request.creation-request';
const ACCESS_REQUEST_UID = 'api::access-request.access-request';
const VOYAGE_UID = 'api::voyage.voyage';
const USER_UID = 'api::authorized-user.authorized-user';

const dropletData = (overrides = {}) => ({
  name: unique('Droplet'),
  slug: SLUG_PLACEHOLDER,
  type: 'knowledge',
  focusArea: 'technical',
  difficulty: 'beginner',
  learningObjectives: [{ objective: 'Understand the basics' }],
  ...overrides,
});

const lessonData = (overrides = {}) => ({
  name: unique('Lesson'),
  slug: SLUG_PLACEHOLDER,
  blocksV2: { type: 'doc', content: [{ type: 'paragraph' }] },
  ...overrides,
});

const playlistData = (overrides = {}) => ({
  name: unique('Playlist'),
  slug: SLUG_PLACEHOLDER,
  ...overrides,
});

const voyageData = (overrides = {}) => {
  const name = unique('Voyage');
  return { name, slug: name.toLowerCase().replace(/\s+/g, '-'), ...overrides };
};

const accessRequestData = (overrides = {}) => ({
  givenName: 'Ada',
  familyName: 'Lovelace',
  email: `${unique('ada').replace(/\s/g, '-')}@example.com`,
  affiliation: 'faculty',
  college: 'KCCS',
  ...overrides,
});

const userData = (overrides = {}) => ({
  email: `${unique('user').replace(/\s/g, '-')}@example.com`,
  firstName: 'Grace',
  lastName: 'Hopper',
  ...overrides,
});

module.exports = {
  unique,
  SLUG_PLACEHOLDER,
  DROPLET_UID,
  LESSON_UID,
  PLAYLIST_UID,
  CREATION_REQUEST_UID,
  ACCESS_REQUEST_UID,
  USER_UID,
  VOYAGE_UID,
  dropletData,
  voyageData,
  lessonData,
  playlistData,
  accessRequestData,
  userData,
};
