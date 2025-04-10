"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";

export function DropletDescriptionInput({
  initialContent,
  updateContent,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-8 before:left-8 before:pointer-events-none before:select-none",
      }),
      Text,
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sky w-full max-w-2xl p-8 mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:text-slate-300 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none",
      },
    },
    immediatelyRender: false,
  });

  return (
    <EditorContent role="textbox" name="droplet-description" editor={editor} />
  );
}
