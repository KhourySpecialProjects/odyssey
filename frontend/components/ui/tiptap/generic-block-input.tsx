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
import { CodeBlockComponent } from "./toolbar/tools/code-tool/code-tool";
import { all, createLowlight } from "lowlight";
import GeneralToolbar from "./toolbar/general-toolbar";

const lowlight = createLowlight(all);

export function GenericBlockInput({
  initialContent,
  updateContent,
  revalidate,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
  revalidate: () => void;
}) {
  const editor = useEditor({
    extensions: [
      Link,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Underline,
      StartingKit,
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
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-3 before:left-3 before:pointer-events-none before:select-none",
      }),
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "w-full border min-h-32 border-slate-200 p-3 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll rounded-b-md hover:shadow focus:shadow-lg outline-none",
      },
      handleKeyDown: (view: any, event: KeyboardEvent) => {
        if (event.key === "Tab") {
          if (view.state.selection.$from.parent.type.name === "codeBlock") {
            event.preventDefault();
            view.dispatch(view.state.tr.insertText("\t"));
            return true;
          }

          return false;
        }
        return false;
      },
    },
    immediatelyRender: false,
    onDestroy: () => {
      revalidate();
    },
  });

  return (
    <div>
      <GeneralToolbar editor={editor!} />
      <EditorContent name="lesson-generic" editor={editor} />
    </div>
  );
}
