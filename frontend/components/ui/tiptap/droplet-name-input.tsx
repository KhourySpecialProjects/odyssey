"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import { useEffect } from "react";

export function DropletNameInput({
  initialContent,
  updateContent,
  onBlur,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
  onBlur?: () => void;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Heading.configure({
        levels: [1],
        HTMLAttributes: {
          class: "text-[2.5rem] font-bold text-slate-900 dark:text-white",
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
        class: "outline-none cursor-text px-1 py-2",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.focus("end");
    }
  }, [editor]);

  return <EditorContent name="droplet-name" editor={editor} role="textbox" />;
}
