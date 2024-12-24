"use client";

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  JSONContent,
  Editor,
} from "@tiptap/react";
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
import CustomImage from "./custom-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockComponent } from "./toolbar/tools/code-tool";
import { all, createLowlight } from "lowlight";
import GeneralToolbar from "./toolbar/general-toolbar";

const lowlight = createLowlight(all);

export function ExpandableBlockInput({
  initialContent,
  updateContent,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StartingKit,
      Link,
      Underline,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({
        lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
        defaultLanguage: "python",
      }),
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sky  p-2 max-w-full min-h-32 border rounded-b-md border-slate-200 hover:shadow focus:shadow-lg outline-none",
      },
    },
    immediatelyRender: false,
  });

  return (
    <div>
      <div>
        <GeneralToolbar editor={editor!} />
        <EditorContent name="lesson-expandable-body" editor={editor} />
      </div>
    </div>
  );
}
