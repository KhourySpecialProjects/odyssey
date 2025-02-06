import { QuizQuestion, QuizAnswerOption, OpenEndedQuizQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import { TrashIcon, PlusIcon } from "lucide-react";
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface QuizQuestionEditorProps {
  question: (QuizQuestion | OpenEndedQuizQuestion);
  onUpdate: (question: (QuizQuestion | OpenEndedQuizQuestion)) => void;
  onDelete: () => void;
}

export function QuizQuestionEditor({
  question,
  onUpdate,
  onDelete,
}: QuizQuestionEditorProps) {
  console.log('Question type in editor:', 'answerOptions' in question ? 'QuizQuestion' : 'OpenEndedQuizQuestion');

  if ('answerOptions' in question) {
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
            : answer.isCorrect
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
        />
  
      <div className="space-y-4 pt-4">
          <h5 className="font-semibold">Answer Options</h5>
          <div className="space-y-4">
            {question.answerOptions.map((answer, index) => (
              <div key={answer.id} className="flex items-start space-x-3 w-full">
                <Checkbox
                  id={answer.id.toString()}
                  checked={answer.isCorrect}
                  onCheckedChange={() => setSelectedAnswer(answer.id.toString())}
                  className="mt-3"
                />
                <div className="flex-1">
                  <TipTapEditor
                    initialContent={answer.content}
                    updateContent={(content) => updateAnswer(index, content)}
                    revalidate={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
  
          {question.answerOptions.length < 4 && (
            <Button variant="outline" size="sm" onClick={addAnswer}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Answer Option
            </Button>
          )}
        </div>
      </div>
    );
  } else {
    const updateContent = (content: string) => {
      onUpdate({ ...question, content });
    };
    const updateCorrectAnswer = (correctAnswer: string) => {
      const updatedQuestion: OpenEndedQuizQuestion = {
        id: question.id,
        content: question.content,
        correctAnswer: correctAnswer
      };
      onUpdate(updatedQuestion);
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
        />
    
        <div className="space-y-4 pt-4">
          <h5 className="font-semibold">Correct Answer</h5>
          <Textarea
            value={question.correctAnswer}
            onChange={(e) => updateCorrectAnswer(e.target.value)}
            placeholder="Enter the correct answer..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    );
  }

}