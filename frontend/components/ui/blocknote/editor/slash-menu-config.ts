import { DefaultReactSuggestionItem } from "@blocknote/react";
import { insertOrUpdateBlock } from "@blocknote/core";
import { createElement } from "react";
import type { ReactElement } from "react";
import type { CustomBlockNoteEditor } from "@/lib/blocknote/schema";
import type { CalloutType } from "@/lib/blocknote/types";
import { Code, Play, AppWindow, Columns2 } from "lucide-react";
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
    "Highlight common mistakes or pitfalls to avoid",
    createElement(TriangleAlert, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "question",
    "Question",
    ["question", "q", "help"],
    "Pose a thought-provoking question for students to consider",
    createElement(CircleHelp, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "important",
    "Important",
    ["important", "imp", "key"],
    "Emphasize key concepts or must-know information",
    createElement(CircleAlert, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "definition",
    "Definition",
    ["definition", "def", "define"],
    "Define a term, concept, or technical vocabulary",
    createElement(BookOpenText, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "more-information",
    "More Information",
    ["more", "info", "more information", "additional"],
    "Add optional deeper context for curious students",
    createElement(BadgeInfo, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "caution",
    "Caution",
    ["caution", "careful", "watch"],
    "Warn about something that could cause errors or confusion",
    createElement(Bell, { className: "h-4 w-4" }),
  ),
  createCalloutItem(
    editor,
    "default",
    "Default Callout",
    ["callout", "default", "note"],
    "General-purpose callout for notes or asides",
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
    subtext: "Quick comprehension check with a true or false answer",
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
    subtext: "Free-response question where students type their own answer",
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
    subtext: "Question with selectable answer options — great for assessments",
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
    subtext: "Use for equations, formulas, or mathematical notation",
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
              code: "",
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
    subtext:
      "Show read-only code examples with syntax highlighting and optional execution",
  },
];

export const getNotebookCodeSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "Notebook Code",
    icon: createElement(Play, { className: "h-4 w-4" }),
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "notebook-code",
            props: {
              code: "# Write your Python code here\n",
              language: "python",
              editable: "true",
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["notebook", "jupyter", "python", "colab", "dataset"],
    group: "Code",
    subtext:
      "Jupyter-like cell where students write and run Python — only block that can use uploaded datasets",
  },
];

export const getSandpackSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "Live Sandbox",
    icon: createElement(AppWindow, { className: "h-4 w-4" }),
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "sandpack-block",
            props: {
              template: "vanilla",
              files: "{}",
              showPreview: true,
              editable: true,
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: [
      "sandbox",
      "sandpack",
      "live",
      "playground",
      "interactive",
      "web",
      "code",
      "editor",
      "repl",
      "livecode",
      "codepen",
    ],
    group: "Code",
    subtext:
      "Live HTML/CSS/JS sandbox with real-time preview — ideal for web dev lessons",
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
    subtext: "Insert a divider to start a new slide in presentation mode",
  },
];

export const getColumnBreakSlashMenuItems = (
  editor: CustomBlockNoteEditor,
): DefaultReactSuggestionItem[] => [
  {
    title: "Column Break",
    icon: createElement(Columns2, { className: "h-4 w-4" }),
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "column-break" }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["column", "col break", "split column", "column break"],
    group: "Presentation",
    subtext:
      "Split content into two columns — use within a slide for side-by-side layout",
  },
];
