import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { Trash2Icon } from "lucide-react";

export const OpenEndedQuiz = createReactBlockSpec(
  {
    type: "quiz-open-ended",
    propSchema: {
      ...defaultProps,
      question: {
        default: "",
      },
      correctAnswer: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { question, correctAnswer } = props.block.props;

      const handleQuestionChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
      ) => {
        props.editor.updateBlock(props.block, {
          props: { question: e.target.value },
        });
      };

      const handleCorrectAnswerChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
      ) => {
        props.editor.updateBlock(props.block, {
          props: { correctAnswer: e.target.value },
        });
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      return (
        <div className="w-full max-w-2xl rounded-lg border-2 border-gray-200 bg-white pb-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div
            className="mb-4 flex w-full flex-row items-center justify-between p-4"
            contentEditable="false"
          >
            <h2 className="text-lg">Open-Ended Quiz</h2>
            <div contentEditable="false">
              <Trash2Icon
                className="cursor-pointer text-red-600 hover:text-red-700"
                onClick={handleDelete}
                data-testid="delete-block"
              />
            </div>
          </div>

          <div className="space-y-6 px-4">
            {/* Question */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Question:
              </label>
              <textarea
                value={question}
                onChange={handleQuestionChange}
                placeholder="Nothing here yet..."
                className="resize-vertical min-h-[80px] w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Correct Answer */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Answer:
              </label>
              <textarea
                value={correctAnswer}
                onChange={handleCorrectAnswerChange}
                placeholder="Enter the correct answer..."
                className="resize-vertical min-h-[80px] w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Student answers will be checked for exact match
                (case-insensitive)
              </p>
            </div>
          </div>
        </div>
      );
    },
  },
);
