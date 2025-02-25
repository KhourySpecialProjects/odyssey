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
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  answerIds: z.array(z.string()),
});

export function QuizQuestionBlock({ question }: { question: QuizQuestion }) {
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.answerIds.length > 0) {
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
        className="prose prose-sky prose-table:text-left prose-p:text-center"
        dangerouslySetInnerHTML={{ __html: question.content }}
      ></div>

      {showResult ? (
        <div className="px-8 py-12 mt-4 text-center border rounded-md border-slate-200">
          {areAnswersCorrect(form.getValues("answerIds")) ? (
            <>
              <Badge className="text-green-700 bg-green-100 text-lg hover:bg-green-200">
                That&rsquo;s Right!
              </Badge>
            </>
          ) : (
            <>
              <Badge className="text-orange-700 bg-orange-100 text-lg hover:bg-orange-200">
                Not Quite
              </Badge>

              <div className="my-8">
                <span className="text-sm font-bold uppercase text-sky-700">
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
      ) : correctAnswers.length != 1 ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="answerIds"
              render={({ field }) => (
                <FormItem>
                  <div>Choose multiple answers</div>
                  <FormControl>
                    <div className="mt-4 space-y-3">
                      {question.answerOptions.map((answer, number: number) => (
                        <FormItem
                          key={answer.id}
                          className="flex items-center space-x-3"
                        >
                          <FormControl>
                            <Checkbox
                              value={String(answer.id)}
                              checked={field.value.includes(String(answer.id))}
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
                          <FormLabel
                            htmlFor={String(answer.id)}
                            className="cursor-pointer flex-1"
                          >
                            <span
                              dangerouslySetInnerHTML={{
                                __html: answer.content,
                              }}
                            />
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end mt-4">
              <Button type="submit" after={<ArrowRightIcon />}>
                Check Answer
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="answerIds"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div>Choose one answer</div>
                  <FormControl>
                    <RadioGroup
                      className="mt-4"
                      onValueChange={(value) => field.onChange([value])}
                      value={field.value[0]}
                    >
                      {question.answerOptions.map((answer, number: number) => (
                        <FormItem key={answer.id} className="space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={String(answer.id)}
                              id={String(answer.id)}
                              className="sr-only peer"
                            />
                          </FormControl>
                          <FormLabel
                            htmlFor={String(answer.id)}
                            className="flex cursor-pointer flex-row items-center gap-3 rounded-md border border-slate-200 hover:border-sky-700 bg-popover p-4 leading-5 hover:bg-slate-50 transition-colors hover:text-sky-700 peer-data-[state=checked]:border-sky-700 [&:has([data-state=checked])]:border-sky-700"
                          >
                            <span className="flex items-center justify-center w-8 h-8 text-sm font-bold border rounded-full aspect-square border-sky-700 bg-slate-100 text-sky-700">
                              {number === 0
                                ? "A"
                                : number === 1
                                  ? "B"
                                  : number === 2
                                    ? "C"
                                    : number === 3
                                      ? "D"
                                      : "?"}
                            </span>
                            <div
                              className="prose prose-m w-full"
                              dangerouslySetInnerHTML={{
                                __html: answer.content,
                              }}
                            />
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end mt-4">
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
