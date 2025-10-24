interface QuizAnswer {
  answerIds: string[];
  showResult: boolean;
  timestamp: number;
}

export const saveQuizAnswer = (
  lessonId: number,
  questionId: number,
  answerIds: string[],
  showResult: boolean,
) => {
  const key = `quiz-${lessonId}-${questionId}`;
  const data: QuizAnswer = {
    answerIds,
    showResult,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(key, JSON.stringify(data));
};

export const getQuizAnswer = (
  lessonId: number,
  questionId: number,
): QuizAnswer | null => {
  const key = `quiz-${lessonId}-${questionId}`;
  const stored = sessionStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};

export const clearQuizAnswers = (lessonId: number) => {
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith(`quiz-${lessonId}-`)) {
      sessionStorage.removeItem(key);
    }
  });
};

export const markLessonQuizCompleted = (lessonId: number) => {
  const key = `quiz-completed-${lessonId}`;
  sessionStorage.setItem(
    key,
    JSON.stringify({ completed: true, timestamp: Date.now() }),
  );
};

export const isLessonQuizCompleted = (lessonId: number): boolean => {
  const key = `quiz-completed-${lessonId}`;
  const stored = sessionStorage.getItem(key);
  return stored ? JSON.parse(stored).completed : false;
};
