import type {
  AiFinding,
  AiScoringRun,
  Review,
  ReviewAnchor,
  ReviewComment,
  ReviewCriterion,
  ReviewScore,
  ReviewTextAnchor,
} from "@/types";

const names = ["Tone", "Style", "Flow", "Scaffolding", "Quality"];

export const mockReviewCriteria: ReviewCriterion[] = names.map((name, i) => ({
  id: i + 1,
  documentId: `criterion-${i + 1}`,
  name,
  lessonDescription: `${name}: lesson question.\n1: low\n5: high`,
  overallDescription: `${name}: overall question.\n1: low\n5: high`,
  order: i + 1,
  active: true,
}));

export const mockReview: Review = {
  id: 7,
  documentId: "review-7",
  round: 1,
  key: "3:9:1",
  state: "open",
  summaryNote: null,
  sentAt: null,
};

export const mockReviewAnchor: ReviewAnchor = {
  v: 1,
  field: "blocks",
  blockId: "block-1",
  start: 4,
  end: 11,
  quote: "example",
  prefix: "an ",
  suffix: " text",
};

export const mockReviewComment: ReviewComment = {
  id: 21,
  documentId: "comment-21",
  field: "blocks",
  anchor: mockReviewAnchor,
  body: "Consider a clearer example here.",
  resolvedAt: null,
  parent: null,
};

export const mockAiFinding = (
  overrides: Partial<AiFinding> = {},
): AiFinding => ({
  id: "f1",
  quote: "example",
  reason: "Too vague.",
  lessonId: 3,
  anchor: mockReviewAnchor as ReviewTextAnchor,
  ...overrides,
});

export const mockReviewScore: ReviewScore = {
  id: 31,
  documentId: "score-31",
  criterionName: "Tone",
  value: null,
  aiValue: 4,
  aiRationale: "Engaging voice throughout.",
  key: "7:overall:1",
};

export const mockAiScoringRun: AiScoringRun = {
  id: 41,
  documentId: "run-41",
  runState: "done",
  model: "claude-sonnet-4-5",
  promptVersion: "v1",
  criteria: mockReviewCriteria.map(
    ({ id, name, lessonDescription, overallDescription, order }) => ({
      id,
      name,
      lessonDescription,
      overallDescription,
      order,
    }),
  ),
  failedLessons: [],
  inputTokens: 1200,
  outputTokens: 300,
  error: null,
  startedAt: "2026-10-26T12:00:00.000Z",
  finishedAt: "2026-10-26T12:00:30.000Z",
};
