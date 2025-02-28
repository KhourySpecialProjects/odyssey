"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import GeneralToolbar from "./toolbar/general-toolbar";

interface GeneralTextEditorProps {
  initialContent: string;
  updateContent: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function GeneralTextEditor({
  initialContent,
  updateContent,
  placeholder = "Enter text...",
  className = "",
}: GeneralTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StartingKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
      }),
    ],

    onUpdate: ({ editor }) => {
      updateContent(editor.getHTML());
    },

    content: initialContent,
    // editorProps: {
    //   attributes: {
    //     class: `prose prose-sky w-full min-h-32 border rounded-b-md border-slate-200 hover:shadow focus:shadow-lg outline-none p-4 ${className}`,
    //   },
    // },
    editorProps: {
      attributes: {
        class: `prose prose-sky prose-code:text-inherit prose-headings:text-inherit dark:text-slate-300 prose-strong:text-inherit w-full max-w-none border rounded-b-md border-slate-200 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none p-4 ${className}`,
      },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="w-full">
      <GeneralToolbar editor={editor} />
      <EditorContent
        name="general-text-editor"
        editor={editor}
        className="w-full"
      />
    </div>
  );
}
