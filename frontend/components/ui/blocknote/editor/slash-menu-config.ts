import { DefaultReactSuggestionItem } from "@blocknote/react";
import { insertOrUpdateBlock } from "@blocknote/core";
import { createElement } from "react";
import type { ReactElement } from "react";
import type { CustomBlockNoteEditor } from "@/lib/blocknote/schema";
import type { CalloutType } from "@/lib/blocknote/types";
import { Code } from "lucide-react";
import {
  TriangleAlert,
  CircleHelp,
  CircleAlert,
  BookOpenText,
  BadgeInfo,
  Bell,
  Pin,
  ToggleLeft,
  FileText,
  LayoutList,
  TypeIcon,
  SeparatorHorizontal,
} from "lucide-react";

const createCalloutItem = (
  editor: CustomBlockNoteEditor,
  type: CalloutType,
  title: string,
  aliases: string[],
  subtext: string,
  icon?: ReactElement,
): DefaultReactSuggestionItem => ({
  title,
  icon,
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
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  createCalloutItem(
    editor,
    "warning",
    "Warning",
    ["warning", "warn", "alert"],
    "Pink warning callout",
    createElement(TriangleAlert, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "question",
    "Question",
    ["question", "q", "help"],
    "Blue question callout",
    createElement(CircleHelp, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "important",
    "Important",
    ["important", "imp", "key"],
    "Orange important callout",
    createElement(CircleAlert, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "definition",
    "Definition",
    ["definition", "def", "define"],
    "Green definition callout",
    createElement(BookOpenText, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "more-information",
    "More Information",
    ["more", "info", "more information", "additional"],
    "Purple info callout",
    createElement(BadgeInfo, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "caution",
    "Caution",
    ["caution", "careful", "watch"],
    "Yellow caution callout",
    createElement(Bell, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "default",
    "Default Callout",
    ["callout", "default", "note"],
    "Gray default callout",
    createElement(Pin, { className: "h-4 w-4" }),
  ),
];
export const getQuizSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "True/False Quiz",
    icon: createElement(ToggleLeft, { className: "h-4 w-4" }),
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
    icon: createElement(FileText, { className: "h-4 w-4" }),
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
    icon: createElement(LayoutList, { className: "h-4 w-4" }),
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
          } as unknown as Parameters<typeof editor.insertBlocks>[0][0],
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

export const getLatexSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "LaTeX",
    icon: createElement(TypeIcon, { className: "h-4 w-4" }),
    onItemClick: () => {
      // Insert a new LaTeX block
      const currentBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [
          {
            type: "latex",
            props: {
              content: "",
              displayMode: false,
            },
          },
        ],
        currentBlock,
        "after",
      );

      // Open the edit dialog immediately
      // We'll need to trigger the edit dialog programmatically
      // For now, the block will render with an Edit button
      // The user can click Edit to open the dialog
    },
    aliases: ["latex", "math", "formula", "equation"],
    group: "Math",
    subtext: "Insert LaTeX math formula block",
  },
];

export const getCodeSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "Code Block",
    icon: createElement(Code, { className: "h-4 w-4" }),
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "code-block",
            props: {
              language: "python",
              code: "# Write your code here\n",
              editable: true,
              runnable: true,
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["code", "snippet", "programming", "syntax"],
    group: "Code",
    subtext: "Display code with syntax highlighting",
  },
];

export const getSlideBreakSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "Slide Break",
    icon: createElement(SeparatorHorizontal, { className: "h-4 w-4" }),
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "slide-break" }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["slide", "break", "presentation", "page break", "divider"],
    group: "Presentation",
    subtext: "Start a new presentation slide",
  },
];
