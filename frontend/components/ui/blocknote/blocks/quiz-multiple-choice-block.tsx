import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { Trash2Icon, PlusIcon, XIcon } from "lucide-react";
import React from "react";

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export const MultipleChoiceQuiz = createReactBlockSpec(
  {
    type: "quiz-multiple-choice",
    propSchema: {
      ...defaultProps,
      question: {
        default: "",
      },
      options: {
        default: [
          { id: "1", text: "", isCorrect: true },
          { id: "2", text: "", isCorrect: false },
        ] as any,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { question } = props.block.props;
      const options = (props.block.props.options || []) as AnswerOption[];
      const blockRef = React.useRef<HTMLDivElement>(null);

      React.useEffect(() => {
        if (blockRef.current) {
          const blockContent = blockRef.current.closest(
            ".bn-block-content",
          ) as HTMLElement;
          if (blockContent) {
            const removeStyles = () => {
              blockContent.removeAttribute("style");
            };

            removeStyles();

            const observer = new MutationObserver(removeStyles);
            observer.observe(blockContent, {
              attributes: true,
              attributeFilter: ["style"],
            });

            const events = ["click", "mousedown", "focus", "focusin"];
            events.forEach((event) => {
              blockContent.addEventListener(event, removeStyles, true);
            });

            return () => {
              observer.disconnect();
              events.forEach((event) => {
                blockContent.removeEventListener(event, removeStyles, true);
              });
            };
          }
        }
      }, []);

      const handleQuestionChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
      ) => {
        props.editor.updateBlock(props.block, {
          props: { question: e.target.value },
        });
      };

      const handleOptionTextChange = (id: string, text: string) => {
        const updatedOptions = options.map((opt: AnswerOption) =>
          opt.id === id ? { ...opt, text } : opt,
        );
        props.editor.updateBlock(props.block, {
          props: { options: updatedOptions as any },
        });
      };

      const handleOptionCorrectChange = (id: string) => {
        const updatedOptions = options.map((opt: AnswerOption) => ({
          ...opt,
          isCorrect: opt.id === id,
        }));
        props.editor.updateBlock(props.block, {
          props: { options: updatedOptions as any },
        });
      };

      const handleAddOption = () => {
        const newOption = {
          id: Date.now().toString(),
          text: "",
          isCorrect: false,
        };
        props.editor.updateBlock(props.block, {
          props: { options: [...options, newOption] as any },
        });
      };

      const handleRemoveOption = (id: string) => {
        if (options.length <= 2) return;
        const updatedOptions = options.filter(
          (opt: AnswerOption) => opt.id !== id,
        );
        props.editor.updateBlock(props.block, {
          props: { options: updatedOptions as any },
        });
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      return (
        <div
          ref={blockRef}
          onMouseDown={(e) => {
            if (blockRef.current) {
              const blockContent = blockRef.current.closest(
                ".bn-block-content",
              ) as HTMLElement;
              if (blockContent) {
                blockContent.removeAttribute("style");
              }
            }
          }}
          className="w-full max-w-2xl rounded-lg border-2 border-gray-200 bg-white pb-4 dark:border-gray-700 dark:bg-gray-800"
        >
          {/* Header */}
          <div className="mb-4 flex w-full flex-row items-center justify-between p-4">
            <h2 className="text-lg">Multiple Choice Quiz</h2>
            <Trash2Icon
              className="cursor-pointer text-red-600 hover:text-red-700"
              onClick={handleDelete}
              onMouseDown={(e) => e.preventDefault()}
              data-testid="delete-block"
            />
          </div>

          <div className="space-y-6 px-4">
            {/* Question */}
            <div>
              <label className="mb-2 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Question:
              </label>
              <textarea
                value={question}
                onChange={handleQuestionChange}
                placeholder="Nothing here yet..."
                className="resize-vertical min-h-[80px] w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Answer Options */}
            <div>
              <label className="mb-2 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Answer Options:
              </label>
              <div className="space-y-3">
                {options.map((option: AnswerOption, index: number) => (
                  <div key={option.id} className="flex items-start gap-2">
                    {/* Checkbox for correct answer */}
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={() => handleOptionCorrectChange(option.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="mt-4 h-5 w-5 cursor-pointer"
                    />

                    {/* Option text */}
                    <textarea
                      value={option.text}
                      onChange={(e) =>
                        handleOptionTextChange(option.id, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="resize-vertical min-h-[60px] flex-1 rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />

                    {/* Delete option button */}
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(option.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="mt-3 rounded p-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      >
                        <XIcon size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Option Button */}
              {options.length < 6 && (
                <button
                  onClick={handleAddOption}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <PlusIcon size={16} />
                  Add Option
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
);
