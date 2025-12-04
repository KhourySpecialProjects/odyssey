"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuizQuestion } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { saveQuizAnswer, getQuizAnswer } from "@/lib/quiz-storage";
import posthog from "posthog-js";

const formSchema = z.object({
  answerIds: z.array(z.string()),
});

export function QuizQuestionBlock({
  question,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
}: {
  question: QuizQuestion;
  lessonId: number;
  dropletId?: number;
  dropletName?: string;
  lessonName?: string;
  userId?: number;
}) {
  const [showResult, setShowResult] = useState(false);
  const correctAnswers = useMemo(
    () => question.answerOptions.filter((option) => option.isCorrect),
    [question],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answerIds: [],
    },
  });

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

  // Load saved answer on mount
  useEffect(() => {
    const saved = getQuizAnswer(lessonId, question.id);
    if (saved && saved.answerIds.length > 0) {
      form.reset({ answerIds: saved.answerIds });

      if (saved.showResult) {
        Promise.resolve().then(() => {
          setShowResult(true);
        });
      }
    }
  }, [lessonId, question.id]);

  // Save answers whenever they change
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.answerIds && value.answerIds.length > 0) {
        const answerIds = value.answerIds.filter(
          (id): id is string => id !== undefined,
        );
        if (answerIds.length > 0) {
          saveQuizAnswer(lessonId, question.id, answerIds, showResult);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [lessonId, question.id, showResult, form]);

  // Save showResult state changes
  useEffect(() => {
    const answerIds = form.getValues("answerIds");
    if (answerIds.length > 0) {
      saveQuizAnswer(lessonId, question.id, answerIds, showResult);
    }
  }, [showResult, lessonId, question.id, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.answerIds.length > 0) {
      const isCorrect = areAnswersCorrect(values.answerIds);

      // Track quiz answer submission
      posthog.capture("quiz_answer_submitted", {
        question_id: question.id,
        question_title: question.content
          .replace(/<[^>]*>/g, "")
          .substring(0, 100), // Strip HTML, limit length
        lesson_id: lessonId,
        lesson_name: lessonName,
        droplet_id: dropletId,
        droplet_name: dropletName,
        is_correct: isCorrect,
        quiz_type: "multiple_choice",
        user_id: userId,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      });

      // If correct, track separately
      if (isCorrect) {
        posthog.capture("quiz_answered_correctly", {
          question_id: question.id,
          question_title: question.content
            .replace(/<[^>]*>/g, "")
            .substring(0, 100),
          lesson_id: lessonId,
          lesson_name: lessonName,
          droplet_id: dropletId,
          droplet_name: dropletName,
          quiz_type: "multiple_choice",
          user_id: userId,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }

      setShowResult(true);
    }
  }

  if (!correctAnswers) {
    console.error(`Quiz question ${question.id} has no correct answer.`);
    return <p className="text-center">This question could not be loaded.</p>;
  }

  function areAnswersCorrect(selectedAnswers: string[]) {
    return (
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every((id) =>
        correctAnswers.map((answer) => String(answer.id)).includes(id),
      )
    );
  }

  return (
    <>
      <div
        role="question"
        className="prose prose-sky prose-table:text-left prose-p:text-center prose-strong:text-inherit prose-code:text-inherit prose-headings:text-inherit dark:text-slate-300"
        dangerouslySetInnerHTML={{ __html: question.content }}
      ></div>

      {showResult ? (
        <div className="mt-4 rounded-md border border-slate-200 px-8 py-12 text-center">
          {areAnswersCorrect(form.getValues("answerIds")) ? (
            <div className="flex flex-col items-center">
              <Badge
                className="bg-green-100 text-lg text-green-700 hover:bg-green-200"
                role="status"
              >
                That&rsquo;s Right!
              </Badge>

              <Button
                before={<ArrowLeftIcon />}
                variant="outline"
                size="sm"
                onClick={() => setShowResult(false)}
                className="mt-2"
              >
                View Answer
              </Button>
            </div>
          ) : (
            <>
              <Badge
                className="bg-orange-100 text-lg text-orange-700 hover:bg-orange-200"
                role="status"
              >
                Not Quite
              </Badge>

              <div className="my-8">
                <span className="text-sm font-bold text-sky-700 uppercase">
                  You selected:
                </span>
                <ul>
                  {form.getValues("answerIds").map((id) => {
                    const selectedAnswer = question.answerOptions.find(
                      (opt) => String(opt.id) === id,
                    );
                    return selectedAnswer ? (
                      <li
                        key={id}
                        dangerouslySetInnerHTML={{
                          __html: selectedAnswer.content,
                        }}
                      />
                    ) : null;
                  })}
                </ul>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="answerIds"
              render={({ field }) => (
                <FormItem>
                  <div className="dark:text-slate-300">
                    {correctAnswers.length === 1
                      ? "Select one answer"
                      : "Choose multiple answers"}
                  </div>
                  <FormControl>
                    {correctAnswers.length === 1 ? (
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange([value]);
                        }}
                        value={field.value[0]}
                        className="mt-4 space-y-3"
                      >
                        {question.answerOptions.map((answer) => (
                          <FormItem
                            key={answer.id}
                            className="flex items-center space-x-3"
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={String(answer.id)}
                                className="border dark:border-slate-50"
                              />
                            </FormControl>
                            <FormLabel className="flex-1 cursor-pointer">
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: answer.content,
                                }}
                              />
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {question.answerOptions.map((answer) => (
                          <FormItem
                            key={answer.id}
                            className="flex items-center space-x-3"
                          >
                            <FormControl>
                              <Checkbox
                                value={String(answer.id)}
                                checked={field.value.includes(
                                  String(answer.id),
                                )}
                                onCheckedChange={(checked) => {
                                  field.onChange(
                                    checked
                                      ? [...field.value, String(answer.id)]
                                      : field.value.filter(
                                          (id) => id !== String(answer.id),
                                        ),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="flex-1 cursor-pointer">
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: answer.content,
                                }}
                              />
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="mt-4 flex justify-end">
              <Button type="submit" after={<ArrowRightIcon />}>
                Check Answer
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}
