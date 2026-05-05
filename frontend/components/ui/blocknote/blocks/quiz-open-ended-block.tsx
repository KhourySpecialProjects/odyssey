import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { Trash2Icon } from "lucide-react";
import React from "react";
import { QuizRichTextInput } from "./quiz-rich-text-input";

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

      const handleQuestionChange = (html: string) => {
        props.editor.updateBlock(props.block, {
          props: { question: html },
        });
      };

      const handleCorrectAnswerChange = (html: string) => {
        props.editor.updateBlock(props.block, {
          props: { correctAnswer: html },
        });
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      return (
        <div className="w-full rounded-lg border-2 border-gray-200 bg-white pb-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="mb-4 flex w-full flex-row items-center justify-between p-4">
            <h2 className="text-sm font-semibold tracking-wide text-black dark:text-white">
              Open-Ended Quiz
            </h2>
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
                placeholder="Nothing here yet..."
              />
            </div>

            {/* Correct Answer */}
            <div>
              <label className="mb-2 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Answer:
              </label>
              <QuizRichTextInput
                value={correctAnswer}
                onChange={handleCorrectAnswerChange}
                placeholder="Enter the correct answer..."
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Student answers will be checked for exact match
                (case-insensitive, HTML stripped)
              </p>
            </div>
          </div>
        </div>
      );
    },
  },
);
