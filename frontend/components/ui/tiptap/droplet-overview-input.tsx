"use client";

import { useEditor, EditorContent, JSONContent, Editor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import Text from "@tiptap/extension-text";
import OrderedList from "@tiptap/extension-ordered-list";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import StartingKit from "@tiptap/starter-kit";
import { Bold, Star } from "lucide-react";
import { Suspense, useState, useActionState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Link from "@tiptap/extension-link";

export function DropletOverviewInput({
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
          "prose prose-sky w-full max-w-2xl p-8 mt-4 border rounded-md bg-slate-50 border-slate-200 hover:shadow focus:shadow-lg outline-none",
      },
    },
    immediatelyRender: false,
  });

  return <EditorContent name="droplet-overview" editor={editor} />;
}
