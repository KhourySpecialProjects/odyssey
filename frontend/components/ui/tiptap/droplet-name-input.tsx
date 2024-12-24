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
          class: "text-6xl font-black text-slate-900",
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
