"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";

export function LessonNameInput({
  initialContent,
  updateContent,
  className,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
  className: string;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Heading.configure({
        levels: [1],
        HTMLAttributes: {
          class: "text-5xl font-extrabold text-balance",
        },
      }),
      Text,
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class: "hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2",
      },
    },
    immediatelyRender: false,
  });

  return (
    <EditorContent
      className={className}
      name="lesson-expandable-body"
      editor={editor}
    />
  );
}
