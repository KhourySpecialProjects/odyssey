"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import { useEffect } from "react";

export function LessonNameInput({
  initialContent,
  updateContent,
  className,
  onBlur,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
  className: string;
  onBlur?: () => void;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Heading.configure({
        levels: [1],
        HTMLAttributes: {
          class:
            "text-[2.5rem] font-bold text-balance text-slate-900 dark:text-white",
        },
      }),
      Text,
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    onBlur: () => {
      onBlur?.();
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class: "outline-none rounded-md px-4 py-2",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.focus("end");
    }
  }, [editor]);

  return (
    <EditorContent
      className={className}
      name="lesson-expandable-body"
      editor={editor}
    />
  );
}
