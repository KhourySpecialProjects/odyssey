import { OpenEndedQuiz } from "@/types";
import { OpenEndedQuizQuestionBlock } from "./open-ended-quiz-question-block";

export function OpenEndedQuizBlock({ data }: { data: OpenEndedQuiz }) {
  return (
    <div className="px-6 py-12 my-12 -mx-6 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
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
              className="w-full max-w-lg p-6 mx-auto mt-8 bg-white dark:bg-slate-900 dark:border-slate-500 border rounded-md divide-slate-200 border-slate-200"
            >
              <OpenEndedQuizQuestionBlock question={question} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
