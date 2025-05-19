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
  const [numTries, setNumTries] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  const checkAnswer = () => {
    const isAnswerCorrect =
      userAnswer.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();
    setIsCorrect(isAnswerCorrect);
    if (!isCorrect) {
      setNumTries(numTries + 1);
    }
    setShowResult(true);
  };

  return (
    <>
      <div
        className="prose prose-sky prose-table:text-left prose-p:text-center dark:text-slate-300"
        dangerouslySetInnerHTML={{ __html: question.content }}
      />

      {showResult ? (
        <div className="mt-4 rounded-md border border-slate-200 px-8 py-12 text-center">
          {isCorrect ? (
            <>
              <Badge className="bg-green-100 text-lg text-green-700 hover:bg-green-200">
                That&rsquo;s Right!
              </Badge>
              <p className="mt-4 font-medium">
                Your answer matches the expected response.
              </p>
            </>
          ) : (
            <>
              <Badge className="bg-orange-100 text-lg text-orange-700 hover:bg-orange-200">
                Not Quite
              </Badge>
              <div className="my-8">
                <span className="text-sm font-bold text-sky-700 uppercase">
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
      ) : revealAnswer ? (
        <>
          <p className="mt-4 pb-2 font-medium">
            Correct Answer: {question.correctAnswer}
          </p>
          <Button
            before={<ArrowLeftIcon />}
            variant="outline"
            onClick={() => setRevealAnswer(false)}
          >
            Back to Question
          </Button>
        </>
      ) : (
        <div className="mt-4 space-y-4">
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="Textarea min-h-[100px] dark:border dark:border-slate-500 dark:bg-slate-900 dark:text-slate-300"
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setRevealAnswer(true)}
              className={`${numTries >= 3 ? "visibility: visible" : "visibility: hidden"}`}
            >
              View Correct Answer
            </Button>
            <Button onClick={checkAnswer}>Check Answer</Button>
          </div>
        </div>
      )}
    </>
  );
}
