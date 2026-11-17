// One row per lesson quiz submit (ODY-939): ids, a result and a time, never answer text.
// The retention sweep isn't here yet: ODY-937's job will add quiz-attempt.
import { dayBounds } from './ai-scoring-spend';

export const QUIZ_ATTEMPT_UID = 'api::quiz-attempt.quiz-attempt';
const USER_UID = 'api::authorized-user.authorized-user';
const LESSON_UID = 'api::lesson.lesson';
const DROPLET_UID = 'api::droplet.droplet';
const ENROLLMENT_UID = 'api::enrollment.enrollment';

export const QUIZ_TYPES = ['choice', 'open-ended'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];
export const DAILY_LIMIT = 500;

export class QuizAttemptError extends Error {
  constructor(
    public status: 403 | 404 | 429,
    message: string,
  ) {
    super(message);
  }
}

export type RecordQuizAttemptInput = {
  userId: number;
  lessonId: number;
  dropletId: number;
  quizType: QuizType;
  questionId: number;
  correct: boolean;
  submitId: string;
};

type Row = Record<string, any>;

const findId = (uid: string, id: number) =>
  strapi.documents(uid as any).findFirst({ filters: { id }, fields: ['id'] } as any) as Promise<Row | null>;

/** Saves one attempt, numbered per (user, lesson, quizType, question). The same submitId returns the first row. */
export async function recordQuizAttempt(
  input: RecordQuizAttemptInput,
  now = new Date(),
): Promise<{ id: number; attempt: number }> {
  const user = await findId(USER_UID, input.userId);
  if (!user) throw new QuizAttemptError(404, 'User not found');
  const lesson = await findId(LESSON_UID, input.lessonId);
  if (!lesson) throw new QuizAttemptError(404, 'Lesson not found');
  const droplet = await findId(DROPLET_UID, input.dropletId);
  if (!droplet) throw new QuizAttemptError(404, 'Droplet not found');

  const enrolled = await strapi.documents(ENROLLMENT_UID as any).count({
    filters: { authorizedUser: { id: input.userId }, droplet: { id: input.dropletId } },
  } as any);
  if (!enrolled) throw new QuizAttemptError(403, 'Not enrolled in this droplet');

  const documents = strapi.documents(QUIZ_ATTEMPT_UID);
  const existing = (await documents.findFirst({
    filters: { user: { id: input.userId }, submitId: input.submitId },
    sort: ['id:asc'],
    fields: ['id', 'attempt'],
  } as any)) as Row | null;
  if (existing) return { id: Number(existing.id), attempt: Number(existing.attempt) };

  const { start } = dayBounds(now);
  const today = await documents.count({
    filters: { user: { id: input.userId }, createdAt: { $gte: start.toISOString() } },
  } as any);
  if (today >= DAILY_LIMIT) throw new QuizAttemptError(429, 'Too many quiz attempts today');

  const tries = await documents.count({
    filters: {
      user: { id: input.userId },
      lesson: { id: input.lessonId },
      quizType: input.quizType,
      questionId: String(input.questionId),
    },
  } as any);
  const row = await documents.create({
    data: {
      user: user.documentId,
      lesson: lesson.documentId,
      droplet: droplet.documentId,
      quizType: input.quizType,
      questionId: String(input.questionId),
      correct: input.correct,
      attempt: tries + 1,
      submitId: input.submitId,
    },
  } as any);
  return { id: Number(row.id), attempt: tries + 1 };
}
