"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// StarterKit includes: paragraph, inline code mark (Cmd+E), code block,
// bold, italic, and other sensible defaults. We disable the list and
// heading extensions to keep the quiz editor focused.
const extensions = (placeholder: string) => [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Placeholder.configure({ placeholder }),
];

interface QuizRichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function QuizRichTextInput({
  value,
  onChange,
  placeholder = "Type here...",
  minHeight = "60px",
}: QuizRichTextInputProps) {
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value || "",
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
    // Prevent TipTap from stealing focus on mount
    autofocus: false,
  });

  return (
    <div
      className="quiz-rich-text-input w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      style={{ minHeight }}
      // Stop the outer BlockNote editor from claiming mousedown events
      onMouseDown={(e) => e.stopPropagation()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
