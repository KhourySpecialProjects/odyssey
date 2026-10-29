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
const ENROLLMENT_UID = 'api::enrollment.enrollment';

const REVIEW_CRITERION_UID = 'api::review-criterion.review-criterion';
const REVIEW_UID = 'api::review.review';
const REVIEW_COMMENT_UID = 'api::review-comment.review-comment';
const REVIEW_SCORE_UID = 'api::review-score.review-score';
const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const AI_SCORING_RUN_UID = 'api::ai-scoring-run.ai-scoring-run';

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

const enrollmentData = (overrides = {}) => ({
  isComplete: false,
  ...overrides,
});

// Distinct numeric ids per call keep the review and score keys unique.
let keyCounter = 1000;

const reviewData = (overrides = {}) => ({
  round: 1,
  key: `${++keyCounter}:1:1`,
  ...overrides,
});

const reviewCommentData = (overrides = {}) => ({
  field: 'blocks',
  anchor: { blockId: 'bn-1' },
  body: 'Please fix this',
  ...overrides,
});

const reviewScoreData =(overrides = {}) => ({
  criterionName: 'Tone',
  key: `${++keyCounter}:overall:1`,
  ...overrides,
});

const reviewCriterionData = (overrides = {}) => ({
  name: unique('Criterion'),
  lessonDescription: 'Lesson question',
  overallDescription: 'Overall question',
  order: 1,
  ...overrides,
});

module.exports = {
  unique,
  REVIEW_CRITERION_UID,
  REVIEW_UID,
  REVIEW_COMMENT_UID,
  REVIEW_SCORE_UID,
  AI_SCORING_RUN_UID,
  ANNOUNCEMENT_UID,
  reviewData,
  reviewCommentData,
  reviewScoreData,
  reviewCriterionData,
  SLUG_PLACEHOLDER,
  DROPLET_UID,
  LESSON_UID,
  PLAYLIST_UID,
  CREATION_REQUEST_UID,
  ACCESS_REQUEST_UID,
  USER_UID,
  VOYAGE_UID,
  ENROLLMENT_UID,
  dropletData,
  voyageData,
  lessonData,
  playlistData,
  accessRequestData,
  userData,
  enrollmentData,
};
