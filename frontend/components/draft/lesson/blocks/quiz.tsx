import { OpenEndedQuizQuestion, Quiz, QuizQuestion } from "@/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";
// import { QuizQuestionEditor } from "./quiz-question-editor";
import { QuizQuestionEditor } from "./quiz-question-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";

interface QuizEditorProps {
  block: {
    id?: number;
    __component: string;
    questions: (QuizQuestion | OpenEndedQuizQuestion)[];
  };
  updateBlock: (block: Partial<Block>) => void;
  deleteBlock: () => void;
}

interface Block {
  __component: string;
  content?: string;
  id?: number;
  [key: string]: any;
}

export function QuizEditor({
  block,
  updateBlock,
  deleteBlock,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<(QuizQuestion | OpenEndedQuizQuestion)[]>(
    block.questions || [],
  );

  const addQuestion = (input: string) => {
    let newQuestion = null;
    if (input === "multiple choice") {
      const question: QuizQuestion = {
        id: Math.random(), // Temporary ID for new questions
        content: "",
        answerOptions: [
          { id: Math.random(), content: "", isCorrect: true },
          { id: Math.random(), content: "", isCorrect: false },
        ],
      };
      newQuestion = question;
    } else if (input === "open ended") {
      const question: OpenEndedQuizQuestion = {
        id: Math.random(), // Temporary ID for new questions
        content: "",
        correctAnswer: "",
      };
      newQuestion = question;
    }
    if (!newQuestion) {
      throw new Error("no type selected")
    }
    

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
    setIsOpen(false);
  };

  const updateQuestion = (index: number, updatedQuestion: (QuizQuestion | OpenEndedQuizQuestion)) => {
    console.log('Block component type:', block.__component);
    console.log('Type before update:', 'answerOptions' in updatedQuestion ? 'QuizQuestion' : 'OpenEndedQuizQuestion');
    const updatedQuestions = questions.map((q, i) => {
      if (i === index) {
        // Explicitly check and preserve the question type
        if ('correctAnswer' in updatedQuestion) {
          return {
            id: updatedQuestion.id,
            content: updatedQuestion.content,
            correctAnswer: updatedQuestion.correctAnswer
          } as OpenEndedQuizQuestion;
        } else {
          return {
            id: updatedQuestion.id,
            content: updatedQuestion.content,
            answerOptions: updatedQuestion.answerOptions
          } as QuizQuestion;
        }
      }
      return q;
    });
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
    console.log('Updated block:', { __component: block.__component, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Quiz</h3>
        <Button variant="ghost" size="sm" onClick={deleteBlock}>
          <TrashIcon className="w-4 h-4" />
        </Button>
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

      <Button onClick={() => setIsOpen(true)} variant="outline" className="mt-4">
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Question
      </Button>
      <Dialog open={isOpen} onOpenChange={() => setIsOpen(false)}>
      <DialogContent className="sm:max-w-[825px]">
        <DialogHeader>
          <DialogTitle>Would you like to add a multiple-choice question or an open ended question?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">

          <Button onClick={() => addQuestion("multiple choice")} >
            Multiple Choice
          </Button>
          <Button onClick={() => addQuestion("open ended")}>
            Open Ended
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
