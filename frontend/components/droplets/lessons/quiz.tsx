import { Quiz } from "@/types";
import { QuizQuestionBlock } from "./quiz-question";

export function QuizBlock({ data }: { data: Quiz }) {
  return (
    <div className="px-6 py-12 my-12 -mx-6 border rounded-md bg-slate-50 border-slate-200">
      <div className="text-center">
        <h2 className="text-3xl font-black">Let&rsquo;s Check In!</h2>
        <p className="mt-1 text-slate-500">
          Test your knowledge and see what you just learned.
        </p>
      </div>

      <div>
        {data.questions.map((question) => {
          console.log("Raw question:", question);
          return (
            <div
              key={question.id}
              className="w-full max-w-lg p-6 mx-auto mt-8 bg-white border rounded-md divide-slate-200 border-slate-200"
            >
              <QuizQuestionBlock question={question} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
