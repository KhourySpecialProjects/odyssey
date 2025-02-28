import { useState } from "react";
import { OpenEndedQuizQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "lucide-react";

export function OpenEndedQuizQuestionBlock({
  question,
}: {
  question: OpenEndedQuizQuestion;
}) {
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const checkAnswer = () => {
    const isAnswerCorrect =
      userAnswer.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);
  };

  return (
    <>
      <div
        className="prose prose-sky prose-table:text-left prose-p:text-center dark:text-slate-300"
        dangerouslySetInnerHTML={{ __html: question.content }}
      />

      {showResult ? (
        <div className="px-8 py-12 mt-4 text-center border rounded-md border-slate-200">
          {isCorrect ? (
            <>
              <Badge className="text-green-700 bg-green-100 text-lg">
                That&rsquo;s Right!
              </Badge>
              <p className="mt-4 font-medium">
                Your answer matches the expected response.
              </p>
            </>
          ) : (
            <>
              <Badge className="text-orange-700 bg-orange-100 text-lg">
                Not Quite
              </Badge>
              <div className="my-8">
                <span className="text-sm font-bold uppercase text-sky-700">
                  Your answer:
                </span>
                <p className="mt-2 font-medium">{userAnswer}</p>
              </div>
              <Button
                before={<ArrowLeftIcon />}
                variant="outline"
                onClick={() => setShowResult(false)}
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[100px] dark:bg-slate-900 dark:border dark:border-slate-500 dark:text-slate-300"
          />
          <div className="flex justify-end">
            <Button onClick={checkAnswer}>Check Answer</Button>
          </div>
        </div>
      )}
    </>
  );
}
