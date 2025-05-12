import { QuizQuestion } from "@/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, PlusIcon, Trash2Icon } from "lucide-react";
import { QuizQuestionEditor } from "./quiz-question-editor";

interface QuizEditorProps {
  block: Block;
  updateBlock: (block: Partial<Block>) => void;
  deleteBlock: () => void;
}

interface Block {
  __component: string;
  content?: string;
  id?: number;
  questions?: QuizQuestion[];
}

export function QuizEditor({
  block,
  updateBlock,
  deleteBlock,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    block.questions || [],
  );

  const addQuestion = () => {
    let question = null;
    if (questions[0].answerOptions[0].content === "True") {
      const newQuestion: QuizQuestion = {
        id: Math.random(),
        content: "",
        answerOptions: [
          { id: Math.random(), content: "True", isCorrect: true },
          { id: Math.random(), content: "False", isCorrect: false },
        ],
      };
      question = newQuestion;
    } else {
      const newQuestion: QuizQuestion = {
        id: Math.random(),
        content: "",
        answerOptions: [
          { id: Math.random(), content: "", isCorrect: true },
          { id: Math.random(), content: "", isCorrect: false },
        ],
      };
      question = newQuestion;
    }

    const updatedQuestions = [...questions, question];
    setQuestions(updatedQuestions);
    updateBlock({
      __component: block.__component,
      questions: updatedQuestions,
    });
  };

  const updateQuestion = (index: number, updatedQuestion: QuizQuestion) => {
    const updatedQuestions = questions.map((q, i) => {
      if (i === index) {
        return {
          id: updatedQuestion.id,
          content: updatedQuestion.content,
          answerOptions: updatedQuestion.answerOptions,
        } as QuizQuestion;
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
      <div className="z-10 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing">
        <GripVertical size={20} />
      </div>
      <div className="w-full max-w-2xl pb-4">
        <div className="mb-4 flex w-full flex-row items-center justify-between p-4">
          <h2 className="text-lg">
            {questions[0].answerOptions[0].content === "True"
              ? "True/False Quiz"
              : "Multiple Choice Quiz"}
          </h2>
          <Trash2Icon
            className="cursor-pointer text-red-600 hover:text-red-700"
            onClick={deleteBlock}
            data-testid="delete-block"
          />
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuizQuestionEditor
              key={question.id}
              question={question}
              onUpdate={(updatedQuestion) =>
                updateQuestion(index, updatedQuestion)
              }
              onDelete={() => removeQuestion(index)}
            />
          ))}
        </div>

        <Button
          onClick={() => addQuestion()}
          variant="outline"
          className="mt-4"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
