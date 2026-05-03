import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { Trash2Icon } from "lucide-react";
import React from "react";
import { QuizRichTextInput } from "./quiz-rich-text-input";

export const TrueFalseQuiz = createReactBlockSpec(
  {
    type: "quiz-true-false",
    propSchema: {
      ...defaultProps,
      question: {
        default: "",
      },
      correctAnswer: {
        default: true,
        values: [true, false],
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { question, correctAnswer } = props.block.props;

      const handleQuestionChange = (html: string) => {
        props.editor.updateBlock(props.block, {
          props: { question: html },
        });
      };

      const handleAnswerChange = (value: boolean) => {
        props.editor.updateBlock(props.block, {
          props: { correctAnswer: value },
        });
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      return (
        <div className="w-full rounded-lg border-2 border-gray-200 bg-white pb-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Header matching QuizEditor */}
          <div className="mb-4 flex w-full flex-row items-center justify-between p-4">
            <h2 className="text-lg">True/False Quiz</h2>
            <Trash2Icon
              className="cursor-pointer text-red-600 hover:text-red-700"
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid="delete-block"
            />
          </div>

          <div className="space-y-6 px-4">
            {/* Question */}
            <div>
              <label className="mb-2 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Question:
              </label>
              <QuizRichTextInput
                value={question}
                onChange={handleQuestionChange}
                minHeight="80px"
              />
            </div>

            {/* Answer Selection */}
            <div>
              <label className="mb-2 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Answer:
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => handleAnswerChange(true)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`flex-1 rounded-md border-2 p-3 font-medium transition-colors ${
                    correctAnswer === true
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  True
                </button>
                <button
                  onClick={() => handleAnswerChange(false)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`flex-1 rounded-md border-2 p-3 font-medium transition-colors ${
                    correctAnswer === false
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  False
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
);
