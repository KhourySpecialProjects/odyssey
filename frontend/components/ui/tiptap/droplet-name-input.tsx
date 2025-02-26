"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";

export function DropletNameInput({
  initialContent,
  updateContent,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Heading.configure({
        levels: [1],
        HTMLAttributes: {
          class:
            "text-6xl font-black text-slate-900 dark:bg-slate-800 dark:text-white",
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

  return <EditorContent name="droplet-name" editor={editor} />;
}
