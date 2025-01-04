import { QuizQuestion, QuizAnswerOption } from "@/types";
import { Button } from "@/components/ui/button";
import { TrashIcon, PlusIcon } from "lucide-react";
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
      i === index ? { ...answer, content } : answer
    );
    onUpdate({ ...question, answerOptions: updatedAnswers });
  };

  const setCorrectAnswer = (answerId: string) => {
    const updatedAnswers = question.answerOptions.map((answer) => ({
      ...answer,
      isCorrect: answer.id.toString() === answerId,
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

  return (
    <div className="p-6 border rounded-lg bg-white">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-semibold">Question</h4>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>

      <TipTapEditor
        initialContent={question.content}
        updateContent={updateContent}
        revalidate={() => {}}
        // className="min-h-[100px] mb-4"
      />

      <div className="space-y-4 pt-4">
        <h5 className="font-semibold">Answer Options</h5>
        <RadioGroup
          value={question.answerOptions.find((a) => a.isCorrect)?.id.toString()}
          onValueChange={setCorrectAnswer}
        >
          {question.answerOptions.map((answer, index) => (
            <div key={answer.id} className="flex items-center space-x-2 w-full">
              <RadioGroupItem
                value={answer.id.toString()}
                id={answer.id.toString()}
              />
              <div className="flex-1">
                <TipTapEditor
                  initialContent={answer.content}
                  updateContent={(content) => updateAnswer(index, content)}
                  revalidate={() => {}}
                  // className="flex-1 min-h-[50px]"
                />
              </div>
            </div>
          ))}
        </RadioGroup>

        {question.answerOptions.length < 4 && (
          <Button variant="outline" size="sm" onClick={addAnswer}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Answer Option
          </Button>
        )}
      </div>
    </div>
  );
}
