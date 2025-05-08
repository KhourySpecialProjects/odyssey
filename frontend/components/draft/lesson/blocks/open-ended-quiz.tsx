import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OpenEndedQuizQuestion } from "@/types";
import { TrashIcon, PlusIcon, GripVertical, Trash2Icon } from "lucide-react";
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { useState } from "react";
import { Block } from "../add-block";

interface OpenEndedQuizBlock extends Omit<Block, "questions"> {
  questions: OpenEndedQuizQuestion[];
}

interface OpenEndedQuizEditorProps {
  block: OpenEndedQuizBlock;
  updateBlock: (block: Partial<OpenEndedQuizBlock>) => void;
  deleteBlock: () => void;
}

export function OpenEndedQuizEditor({
  block,
  updateBlock,
  deleteBlock,
}: OpenEndedQuizEditorProps) {
  const [questions, setQuestions] = useState<OpenEndedQuizQuestion[]>(
    block.questions || [],
  );

  const addQuestion = () => {
    const question: OpenEndedQuizQuestion = {
      id: Math.random(),
      content: "",
      correctAnswer: "",
    };
    const updatedQuestions = [...questions, question];
    setQuestions(updatedQuestions);
    updateBlock({
      __component: block.__component,
      questions: updatedQuestions,
    });
  };

  const updateQuestion = (
    index: number,
    updatedQuestion: OpenEndedQuizQuestion,
  ) => {
    const updatedQuestions = questions.map((q, i) => {
      if (i === index) {
        return {
          id: updatedQuestion.id,
          content: updatedQuestion.content,
          correctAnswer: updatedQuestion.correctAnswer,
        } as OpenEndedQuizQuestion;
      }
      return q;
    });
    setQuestions(updatedQuestions);
    updateBlock({
      __component: block.__component,
      questions: updatedQuestions,
    });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    updateBlock({
      __component: block.__component,
      questions: updatedQuestions,
    });
  };

  return (
    <div className="flex flex-row items-center">
      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 z-10">
        <GripVertical size={20} />
      </div>
      <div className="w-full max-w-2xl">
        <div className="w-full flex flex-row justify-between items-center p-4">
          <h2 className="text-lg">Open Ended Quiz</h2>
          <Trash2Icon
            className="cursor-pointer text-red-600 hover:text-red-700 "
            onClick={deleteBlock}
            data-testid="delete-block"
          />
        </div>
        <p className="pb-4 p-4">
          Note: when users are typing answers in, their response must match the
          correct answer exactly but it doesn&apos;t have to be case sensitive
        </p>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="p-6 border dark:border-slate-500 rounded-lg light:bg-white"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold">Question {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                  aria-label={`Delete question ${index + 1}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>

              <TipTapEditor
                initialContent={question.content}
                updateContent={(content) =>
                  updateQuestion(index, { ...question, content })
                }
                revalidate={() => {}}
              />

              <div className="space-y-4 pt-4">
                <h5 className="font-semibold">Correct Answer</h5>
                <Textarea
                  value={question.correctAnswer}
                  onChange={(e) =>
                    updateQuestion(index, {
                      ...question,
                      correctAnswer: e.target.value,
                    })
                  }
                  placeholder="Enter the correct answer..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          ))}
        </div>

        <Button onClick={addQuestion} variant="outline" className="mt-4 ">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
