// Types only, so the sidebar can import them (ODY-882, for ODY-886 and ODY-887)
import type { Anchor } from "@/lib/anchors/types";
import type { Block, CustomBlockNoteBlock } from "@/types";

/** The lesson fields Mentor reads. A `Lesson` or an AI-review `SnapshotLesson` fits. */
export type MentorLesson = {
  id: number;
  name: string;
  blocksVersion?: "v1" | "v2" | null;
  blocks?: Block[] | null;
  blocksV2?: CustomBlockNoteBlock[] | null;
};

/** The droplet fields Mentor reads */
export type MentorDroplet = {
  name: string;
  difficulty?: string | null;
  learningObjectives: string[];
};

/** One piece of the lesson, in page order */
export type Passage = {
  /**
   * "p1", "p2"… in page order. Null for what Mentor sees but can't cite:
   * images, videos, and anything whose place in the lesson can't be checked.
   */
  ref: string | null;
  /** As sent to the model, without the ref */
  markdown: string;
  /** The text a reader sees: for the Sources label and finding a selection. Never an answer. */
  plain: string;
  /** Where it is in the lesson (field "blocks"). Null exactly when ref is null. */
  anchor: Anchor | null;
  /** Its block's index in displayBlocksOf(lesson): the blocks the learner page draws, in order */
  blockIndex: number;
  /** False when the size budget left it out of `text` */
  inPrompt: boolean;
};

export type LessonContext = {
  lessonId: number;
  format: "blocknote" | "classic";
  /** Droplet and lesson details, then each passage as "[p3] …", trimmed to the budget */
  text: string;
  /** Estimated tokens in `text`, at 4 characters a token */
  tokens: number;
  /** Every passage, including any the budget left out */
  passages: Passage[];
  /** How many passages the budget left out entirely */
  omitted: number;
  /** Whether the budget cut a passage short or left any out */
  trimmed: boolean;
};

/** A cited passage, as the route sends it to the sidebar at the end of an answer */
export type Citation = {
  ref: string;
  anchor: Anchor;
  /** Its block's index in displayBlocksOf(lesson), as in Passage */
  blockIndex: number;
  /** The passage's first words (about 80 characters), for the Sources line */
  label: string;
};

/** What a request to Mentor is for (ODY-885) */
export type MentorKind = "lesson" | "explain" | "quiz-hint";

/** An earlier turn of the sidebar's conversation, as the browser keeps it */
export type MentorTurn = { role: "student" | "mentor"; text: string };

/**
 * A request to Mentor as the browser sends it, without its droplet and
 * lesson ids: ids and the student's own words, never lesson text
 */
export type MentorInput =
  | { kind: "lesson"; message: string; history?: MentorTurn[] }
  | { kind: "explain"; selection: string; history?: MentorTurn[] }
  | { kind: "quiz-hint"; questionId: number; answerIds: number[] };

/** A choice question as the learner page shows it, with no answer */
export type MentorQuizQuestion = {
  questionId: number;
  /** The question as Markdown */
  question: string;
  /** In page order, with the ids the page renders. True/false has two. */
  options: { id: number; text: string }[];
};
