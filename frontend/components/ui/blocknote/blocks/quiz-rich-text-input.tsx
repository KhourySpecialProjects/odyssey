"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockComponent } from "@/components/ui/tiptap/toolbar/tools/code-tool/code-tool";
import { all, createLowlight } from "lowlight";

// createLowlight(all) is expensive — keep it outside the component.
const lowlight = createLowlight(all);

// BASE_EXTENSIONS is stable across renders. TipTap reconfigures the editor
// when the extensions array changes identity, causing position errors.
const BASE_EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    horizontalRule: false,
    codeBlock: false, // replaced by CodeBlockLowlight below
  }),
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({
    lowlight,
    defaultLanguage: "python",
    HTMLAttributes: { class: "hljs" },
  }),
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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [...BASE_EXTENSIONS, Placeholder.configure({ placeholder })],
    content: "",
    onUpdate({ editor: e }) {
      if (!e.isDestroyed) {
        onChangeRef.current(e.getHTML());
      }
    },
    autofocus: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-sky max-w-none prose-p:my-1 prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit outline-none dark:text-slate-300",
      },
    },
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (!editor || initialized.current) return;
    initialized.current = true;
    if (value?.trim()) {
      editor.commands.setContent(value, false);
    }
  }, [editor]); // intentional: one-shot init, value prop is not reactive

  return (
    <div
      className="quiz-rich-text-input w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      style={{ minHeight }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
