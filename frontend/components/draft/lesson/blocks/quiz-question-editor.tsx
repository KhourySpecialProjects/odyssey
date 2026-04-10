import { QuizQuestion, QuizAnswerOption } from "@/types";
import { Button } from "@/components/ui/button";
import { TrashIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { Checkbox } from "@/components/ui/checkbox";

interface QuizQuestionEditorProps {
  question: QuizQuestion;
  onUpdate: (question: QuizQuestion) => void;
  onDelete: () => void;
}

export function QuizQuestionEditor({
  question,
  onUpdate,
  onDelete,
}: QuizQuestionEditorProps) {
  const updateContent = (content: string) => {
    onUpdate({ ...question, content });
  };

  const updateAnswer = (index: number, content: string) => {
    const updatedAnswers = question.answerOptions.map((answer, i) =>
      i === index ? { ...answer, content } : answer,
    );
    onUpdate({ ...question, answerOptions: updatedAnswers });
  };

  const setSelectedAnswer = (answerId: string) => {
    const updatedAnswers = question.answerOptions.map((answer) => ({
      ...answer,
      isCorrect:
        answer.id.toString() === answerId
          ? !answer.isCorrect
          : answer.isCorrect,
    }));
    onUpdate({ ...question, answerOptions: updatedAnswers });
  };

  const addAnswer = () => {
    const newAnswer: QuizAnswerOption = {
      id: Math.random(),
      content: "",
      isCorrect: false,
    };
    onUpdate({
      ...question,
      answerOptions: [...question.answerOptions, newAnswer],
    });
  };

  const removeAnswer = (id: number) => {
    onUpdate({
      ...question,
      answerOptions: [...question.answerOptions.filter((ans) => ans.id != id)],
    });
  };

  return (
    <div className="light:bg-white rounded-lg border border-[#D0D5DD] p-6 dark:border-slate-600">
      <div className="mb-4 flex items-start justify-between">
        <h4 className="font-semibold">Question</h4>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>

      <TipTapEditor
        initialContent={question.content}
        updateContent={updateContent}
        revalidate={() => {}}
      />

      <div className="space-y-4 pt-4">
        <h5 className="font-semibold">
          {question.answerOptions[0]?.content === "True"
            ? "Answer Options"
            : "Answer Options (choose multiple if applicable)"}
        </h5>
        <div className="space-y-4">
          {question.answerOptions.map((answer, index) => (
            <div key={answer.id} className="flex w-full items-start space-x-3">
              <Checkbox
                id={answer.id.toString()}
                checked={answer.isCorrect}
                onCheckedChange={() => setSelectedAnswer(answer.id.toString())}
                className="mt-3 dark:bg-slate-50"
              />
              <div className="flex-1">
                <TipTapEditor
                  initialContent={answer.content}
                  updateContent={(content) => updateAnswer(index, content)}
                  revalidate={() => {}}
                />
              </div>
              <div
                className="cursor-pointer pt-2 text-red-300 dark:text-red-300"
                onClick={() => removeAnswer(answer.id)}
              >
                <Trash2Icon />
              </div>
            </div>
          ))}
        </div>

        {!(
          question.answerOptions.length === 2 &&
          question.answerOptions[0].content === "True" &&
          question.answerOptions[1].content === "False"
        ) && (
          <Button variant="outline" size="sm" onClick={addAnswer}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Answer Option
          </Button>
        )}
      </div>
    </div>
  );
}
