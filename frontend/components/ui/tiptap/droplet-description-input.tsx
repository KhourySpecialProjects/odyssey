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
      Paragraph.configure({
        HTMLAttributes: {
          class:
            "text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400",
        },
      }),
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-4 before:pointer-events-none before:select-none",
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
          "mt-1 w-full hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2",
      },
    },
    immediatelyRender: false,
  });

  return <EditorContent name="droplet-description" editor={editor} />;
}
