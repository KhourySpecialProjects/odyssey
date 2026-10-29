import type { Block, CustomBlockNoteBlock } from "@/types";

/** One rubric criterion: what to ask of a lesson, and of the droplet overall. */
export type Criterion = {
  id: number;
  name: string;
  lessonDescription: string;
  overallDescription: string;
};

export type SnapshotLesson = {
  id: number;
  name: string;
  type?: string | null;
  blocksVersion?: "v1" | "v2" | null;
  blocks?: Block[] | null;
  blocksV2?: CustomBlockNoteBlock[] | null;
};

/** A droplet frozen as it was scored, so later edits can't change a result. */
export type DropletSnapshot = {
  snapshotVersion: 1;
  takenAt: string;
  source: { strapiUrl: string; dropletId: number };
  droplet: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: string | null;
    focusArea: string | null;
    difficulty: string | null;
    learningObjectives: string[];
    /** The Overview, as HTML */
    overview: string | null;
    prerequisites: {
      name: string;
      description: string | null;
      learningObjectives: string[];
    }[];
    /**
     * The client's old written review (`afterReview`, retired by ODY-808).
     * Shown beside the AI's scores in the spike report, never sent to the model.
     */
    previousReview?: string | null;
  };
  /** In the order a learner takes them */
  lessons: SnapshotLesson[];
};

export type ScoreItem = {
  criterionId: number;
  rationale: string;
  score: number;
};

/** One lesson's scores, for the Overall request; null when its request failed. */
export type LessonScores = { lessonId: number; scores: ScoreItem[] | null };

export type ScoreFailure =
  | "refusal"
  | "max_tokens"
  | "no_text"
  | "invalid_json"
  | "invalid_shape"
  | "missing_criteria";

export type ParsedScores =
  | { ok: true; scores: ScoreItem[] }
  | { ok: false; reason: ScoreFailure; detail?: string };
