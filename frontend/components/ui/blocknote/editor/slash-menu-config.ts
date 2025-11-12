import { DefaultReactSuggestionItem } from "@blocknote/react";
import { insertOrUpdateBlock } from "@blocknote/core";

const createCalloutItem = (
  editor: any,
  type: any,
  title: string,
  aliases: string[],
  subtext: string,
): any => ({
  title,
  onItemClick: () => {
    insertOrUpdateBlock(editor, {
      type: "callout",
      props: { calloutType: type },
    });
  },
  aliases,
  group: "Callouts",
  subtext,
});

export const getCalloutSlashMenuItems = (
  editor: any,
): DefaultReactSuggestionItem[] => [
  createCalloutItem(
    editor,
    "warning",
    "Warning",
    ["warning", "warn", "alert"],
    "Pink warning callout",
  ),
  createCalloutItem(
    editor,
    "question",
    "Question",
    ["question", "q", "help"],
    "Blue question callout",
  ),
  createCalloutItem(
    editor,
    "important",
    "Important",
    ["important", "imp", "key"],
    "Orange important callout",
  ),
  createCalloutItem(
    editor,
    "definition",
    "Definition",
    ["definition", "def", "define"],
    "Green definition callout",
  ),
  createCalloutItem(
    editor,
    "more-information",
    "More Information",
    ["more", "info", "more information", "additional"],
    "Purple info callout",
  ),
  createCalloutItem(
    editor,
    "caution",
    "Caution",
    ["caution", "careful", "watch"],
    "Yellow caution callout",
  ),
  createCalloutItem(
    editor,
    "default",
    "Default Callout",
    ["callout", "default", "note"],
    "Gray default callout",
  ),
];
export const getQuizSlashMenuItems = (editor: any) => [
  {
    title: "True/False Quiz",
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "quiz-true-false",
            props: {
              question: "",
              correctAnswer: true,
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["true false", "tf", "quiz tf", "true/false", "quiz"],
    group: "Quizzes",
    subtext: "Create a true/false question",
  },
  {
    title: "Open-Ended Quiz",
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "quiz-open-ended",
            props: {
              question: "",
              correctAnswer: "",
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["open ended", "open", "essay", "free response", "quiz open"],
    group: "Quizzes",
    subtext: "Create an open-ended question",
  },
  {
    title: "Multiple Choice Quiz",
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "quiz-multiple-choice",
            props: {
              question: "",
              options: [
                { id: "1", text: "", isCorrect: true },
                { id: "2", text: "", isCorrect: false },
              ],
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["multiple choice", "mc", "quiz mc", "mcq"],
    group: "Quizzes",
    subtext: "Create a multiple choice question",
  },
];
