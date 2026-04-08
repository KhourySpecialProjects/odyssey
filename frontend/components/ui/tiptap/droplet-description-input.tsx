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
          "before:content-[attr(data-placeholder)] before:text-[#121216] before:absolute before:top-8 before:left-8 before:pointer-events-none before:select-none",
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
          "prose prose-sky w-full h-full p-8 border rounded-lg bg-[#fcfcfd] dark:bg-slate-800 border-[#D0D5DD] dark:text-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#2D7597] transition-colors outline-none cursor-text",
      },
    },
    immediatelyRender: false,
  });

  return (
    <EditorContent
      className="h-full"
      role="textbox"
      name="droplet-description"
      editor={editor}
    />
  );
}
