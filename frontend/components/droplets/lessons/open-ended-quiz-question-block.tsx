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
import { OpenEndedQuizQuestion } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  answerId: z.string(),
});

export function OpenEndedQuizQuestionBlock({ question }: { question: OpenEndedQuizQuestion }) {
  console.log('Question type in QuizQuestionBlock:', question);
  console.log('Raw question in QuizQuestionBlock:', question);
  console.log('Question properties:', Object.keys(question));

  const [showResult, setShowResult] = useState(false);
  const correctAnswer = question.correctAnswer;

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
          {form.getValues("answerId") === correctAnswer ? (
            <>
              <Badge className="text-green-700 bg-green-100 text-lg">
                That&rsquo;s Right!
              </Badge>

              <p
                className="mt-0.5 font-bold text-pretty prose prose-lg"
                // dangerouslySetInnerHTML={{
                //   __html: question.answerOptions.find(
                //     (option) =>
                //       String(option.id) === form.getValues("answerId"),
                //   )!.content,
                // }}
                
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
                //   dangerouslySetInnerHTML={{
                //     __html: question.answerOptions.find(
                //       (option) =>
                //         String(option.id) === form.getValues("answerId"),
                //     )!.content,
                //   }}
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
            <div className="mt-4 space-y-4">
              <Textarea
                value={form.getValues("answerId")}
                onChange={(e) => form.setValue("answerId", e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button type="submit" after={<ArrowRightIcon />}>
                  Check Answer
                </Button>
              </div>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}
