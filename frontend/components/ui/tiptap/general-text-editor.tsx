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
  isDroplet?: boolean;
}

export function GeneralTextEditor({
  initialContent,
  updateContent,
  placeholder = "Enter text...",
  className = "",
  isDroplet,
}: GeneralTextEditorProps) {
  const CustomLink = Link.extend({
    addOptions() {
      return {
        ...this.parent?.(),
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
        validate: (href) => {
          return /^(https?:\/\/)(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}|[\w.-]+\.[a-zA-Z]{2,})(:\d+)?(\/\S*)?$/.test(
            href,
          );
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StartingKit,
      Underline,
      CustomLink.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: ({ editor }) => {
          // Only show placeholder if editor is completely empty
          const json = editor.getJSON();
          const hasContent = json.content && json.content.length > 0;

          if (!hasContent) {
            return placeholder;
          }

          // Check if there's only one empty paragraph
          if (
            json.content &&
            json.content.length === 1 &&
            json.content[0].type === "paragraph" &&
            (!json.content[0].content || json.content[0].content.length === 0)
          ) {
            return placeholder;
          }

          return "";
        },
        showOnlyWhenEditable: true,
        emptyEditorClass:
          "cursor-text before:content-[attr(data-placeholder)] before:text-gray-500 dark:before:text-slate-300 before:absolute before:top-4 before:left-4 before:pointer-events-none before:select-none",
      }),
    ],

    onUpdate: ({ editor }) => {
      updateContent(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class: `prose prose-sky prose-code:text-inherit prose-li:my-1 prose-headings:text-inherit dark:text-slate-300 prose-strong:text-inherit w-full max-w-none border rounded-b-md border-slate-200 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none p-4 ${className}`,
      },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="w-full">
      <GeneralToolbar editor={editor} isDroplet={isDroplet} />
      <EditorContent
        name="general-text-editor"
        editor={editor}
        className="w-full"
      />
    </div>
  );
}
