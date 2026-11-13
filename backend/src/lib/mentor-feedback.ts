// Student ratings of Mentor answers (ODY-890). Text is stored only when the
// student shares it and the storeSharedAnswers switch is on.
import { dayBounds } from './ai-scoring-spend';
import { loadMentorSettings } from './mentor-settings';
import { MentorUsageError, type MentorKind } from './mentor-usage';

export const MENTOR_FEEDBACK_UID = 'api::mentor-feedback.mentor-feedback';
const USER_UID = 'api::authorized-user.authorized-user';
const LESSON_UID = 'api::lesson.lesson';
const DROPLET_UID = 'api::droplet.droplet';

export type MentorCitation = { ref: string; blockId?: string; blockIndex?: number };

export type RecordMentorFeedbackInput = {
  userId: number;
  lessonId: number;
  dropletId: number;
  answerKey: string;
  kind: MentorKind;
  rating: 'up' | 'down';
  questionId?: number;
  citations?: MentorCitation[];
  shared: boolean;
  answerText?: string;
  questionText?: string;
  promptVersion?: string;
};

type Row = Record<string, any>;

const findId = (uid: string, id: number) =>
  strapi.documents(uid as any).findFirst({ filters: { id }, fields: ['id'] } as any) as Promise<Row | null>;

/** Creates or updates the user's row for this answer. canShare mirrors the switch. */
export async function recordMentorFeedback(
  input: RecordMentorFeedbackInput,
  now = new Date(),
): Promise<{ id: number; canShare: boolean }> {
  const { storeSharedAnswers, perUserDailyLimit } = await loadMentorSettings();
  if (!storeSharedAnswers && (input.answerText || input.questionText)) {
    throw new MentorUsageError(403, 'Sharing answers is off');
  }

  const user = await findId(USER_UID, input.userId);
  if (!user) throw new MentorUsageError(404, 'User not found');
  const lesson = await findId(LESSON_UID, input.lessonId);
  if (!lesson) throw new MentorUsageError(404, 'Lesson not found');
  const droplet = await findId(DROPLET_UID, input.dropletId);
  if (!droplet) throw new MentorUsageError(404, 'Droplet not found');

  const documents = strapi.documents(MENTOR_FEEDBACK_UID);
  const existing = (await documents.findMany({
    filters: { user: { id: input.userId }, answerKey: input.answerKey },
    sort: ['id:asc'],
    fields: ['id', 'kind'],
  } as any)) as Row[];
  // An untick always clears text; a share must match every row's kind.
  if (input.shared && existing.some((row) => row.kind !== input.kind)) {
    throw new MentorUsageError(400, "Kind can't change");
  }

  // Texts are null unless shared; the controller already pairs them with `shared`.
  const mutable = {
    rating: input.rating,
    shared: input.shared,
    answerText: input.shared ? (input.answerText ?? null) : null,
    questionText: input.shared ? (input.questionText ?? null) : null,
  };

  if (existing.length) {
    // A racing double create can leave copies; update them all so none keeps text.
    for (const row of existing) {
      await documents.update({ documentId: row.documentId, data: mutable } as any);
    }
    return { id: Number(existing[0].id), canShare: storeSharedAnswers };
  }

  const { start } = dayBounds(now);
  const today = await documents.count({
    filters: {
      user: { id: input.userId },
      createdAt: { $gte: start.toISOString() },
    },
  } as any);
  if (today >= perUserDailyLimit) {
    throw new MentorUsageError(429, 'Too many ratings today');
  }

  const row = await documents.create({
    data: {
      ...mutable,
      user: user.documentId,
      lesson: lesson.documentId,
      droplet: droplet.documentId,
      answerKey: input.answerKey,
      kind: input.kind,
      questionId: input.questionId ?? null,
      citations: input.citations ?? [],
      promptVersion: input.promptVersion ?? null,
    },
  } as any);
  return { id: Number(row.id), canShare: storeSharedAnswers };
}
