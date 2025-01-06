"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  CircleXIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  answerId: z.string(),
});

export function QuizQuestionBlock({ question }: { question: QuizQuestion }) {
  const [showResult, setShowResult] = useState(false);
  const correctAnswer = useMemo(
    () => question.answerOptions.find((option) => option.isCorrect),
    [question]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answerId: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.answerId) {
      setShowResult(true);
    }
  }

  if (!correctAnswer) {
    console.error(`Quiz question ${question.id} has no correct answer.`);
    return <p className="text-center">This question could not be loaded.</p>;
  }

  return (
    <>
      <div
        className="prose prose-sky prose-table:text-left prose-p:text-center"
        dangerouslySetInnerHTML={{ __html: question.content }}
      ></div>

      {showResult ? (
        <div className="px-8 py-12 mt-4 text-center border rounded-md border-slate-200">
          {form.getValues("answerId") === String(correctAnswer.id) ? (
            <>
              <Badge className="text-green-700 bg-green-100 text-lg">
                That&rsquo;s Right!
              </Badge>

              <p
                className="mt-0.5 font-bold text-pretty prose prose-lg"
                dangerouslySetInnerHTML={{
                  __html: question.answerOptions.find(
                    (option) => String(option.id) === form.getValues("answerId")
                  )!.content,
                }}
              />
            </>
          ) : (
            <>
              <Badge className="text-orange-700 bg-orange-100 text-lg">
                Not Quite
              </Badge>

              <div className="my-8">
                <span className="text-sm font-bold uppercase text-sky-700">
                  You selected:
                </span>
                <p
                  className="mt-0.5 font-bold text-pretty prose prose-lg"
                  dangerouslySetInnerHTML={{
                    __html: question.answerOptions.find(
                      (option) =>
                        String(option.id) === form.getValues("answerId")
                    )!.content,
                  }}
                />
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
              name="answerId"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <RadioGroup
                      className="mt-4"
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
