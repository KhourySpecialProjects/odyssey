import { Quiz } from "@/types";
import { QuizQuestionBlock } from "./quiz-question";

export function QuizBlock({
  data,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
}: {
  data: Quiz;
  lessonId: number;
  dropletId?: number;
  dropletName?: string;
  lessonName?: string;
  userId?: number;
}) {
  return (
    <div className="-mx-6 my-12 rounded-md border border-slate-200 bg-slate-50 px-6 py-12 dark:border-slate-500 dark:bg-slate-800">
      <div className="text-center">
        <h2 className="text-3xl font-black">Let&rsquo;s Check In!</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-300">
          Test your knowledge and see what you just learned.
        </p>
      </div>
      <div>
        {data.questions.map((question) => {
          return (
            <div
              key={question.id}
              id="quiz-question"
              className="mx-auto mt-8 w-full max-w-lg divide-slate-200 rounded-md border border-slate-200 bg-white p-6 dark:border-slate-500 dark:bg-slate-900"
            >
              <QuizQuestionBlock
                question={question}
                lessonId={lessonId}
                dropletId={dropletId}
                dropletName={dropletName}
                lessonName={lessonName}
                userId={userId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
