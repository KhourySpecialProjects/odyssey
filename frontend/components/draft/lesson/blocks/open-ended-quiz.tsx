import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OpenEndedQuizQuestion } from "@/types";
import { TrashIcon, PlusIcon } from "lucide-react";
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { useState } from "react";
import { Block } from "../lesson-renderer";  // Import the parent Block interface

interface OpenEndedQuizBlock extends Omit<Block, 'questions'> {
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
    block.questions || []
  );

  const addQuestion = () => {
    const question: OpenEndedQuizQuestion = {
      id: Math.random(),
      content: "",
      correctAnswer: ""
    };
    const updatedQuestions = [...questions, question];
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
  };

  const updateQuestion = (index: number, updatedQuestion: OpenEndedQuizQuestion) => {
    const updatedQuestions = questions.map((q, i) => {
      if (i === index) {
        return {
          id: updatedQuestion.id,
          content: updatedQuestion.content,
          correctAnswer: updatedQuestion.correctAnswer
        } as OpenEndedQuizQuestion;
      }
      return q;
    });
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    updateBlock({ __component: block.__component, questions: updatedQuestions });
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Open Ended Quiz</h3>
        <Button variant="ghost" size="sm" onClick={deleteBlock}>
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="p-6 border rounded-lg bg-white">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold">Question {index + 1}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeQuestion(index)}
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
                    correctAnswer: e.target.value 
                  })
                }
                placeholder="Enter the correct answer..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addQuestion} variant="outline" className="mt-4">
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Question
      </Button>
    </div>
  );
}