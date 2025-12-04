import { useState, useEffect } from "react";
import { OpenEndedQuizQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "lucide-react";
import posthog from "posthog-js";
declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}
export function OpenEndedQuizQuestionBlock({
  question,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
}: {
  question: OpenEndedQuizQuestion;
  lessonId?: number;
  dropletId?: number;
  dropletName?: string;
  lessonName?: string;
  userId?: number;
}) {
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [numTries, setNumTries] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  // Initialize PostHog
  useEffect(() => {
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      window.posthog = posthog;

      if (userId) {
        posthog.identify(userId.toString());
      }
    }
  }, [userId]);

  const checkAnswer = () => {
    const isAnswerCorrect =
      userAnswer.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();
    setIsCorrect(isAnswerCorrect);

    if (!isAnswerCorrect) {
      setNumTries(numTries + 1);
    }

    // Track quiz answer submission
    posthog.capture("quiz_answer_submitted", {
      question_id: question.id,
      question_title: question.content
        .replace(/<[^>]*>/g, "")
        .substring(0, 100),
      lesson_id: lessonId,
      lesson_name: lessonName,
      droplet_id: dropletId,
      droplet_name: dropletName,
      is_correct: isAnswerCorrect,
      quiz_type: "open_ended",
      attempt_number: numTries + 1,
      user_id: userId,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    // If correct, track separately
    if (isAnswerCorrect) {
      posthog.capture("quiz_answered_correctly", {
        question_id: question.id,
        question_title: question.content
          .replace(/<[^>]*>/g, "")
          .substring(0, 100),
        lesson_id: lessonId,
        lesson_name: lessonName,
        droplet_id: dropletId,
        droplet_name: dropletName,
        quiz_type: "open_ended",
        attempts_taken: numTries + 1,
        user_id: userId,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
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
