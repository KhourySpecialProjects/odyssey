"use client";

import {
  useEditor,
  EditorContent,
  JSONContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import CustomImage from "./custom-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockComponent } from "./toolbar/tools/code-tool/code-tool";
import { all, createLowlight } from "lowlight";
import GeneralToolBar from "./toolbar/general-toolbar";

const lowlight = createLowlight(all);

export function CalloutBlockInput({
  initialContent,
  updateContent,
  revalidate,
}: {
  initialContent: JSONContent;
  updateContent: (content: JSONContent) => void;
  revalidate: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StartingKit,
      Link.configure({
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Underline,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 dark:before:text-slate-300 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
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
      BulletList.configure({
        HTMLAttributes: {
          class: "callout-bullet-list",
        },
      }),
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: JSONContent) => void)(editor.getJSON());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit bg-white dark:bg-slate-800 dark:text-slate-300 p-2 min-w-full max-w-2xl min-h-20 border rounded-b-md border-slate-200 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none",
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
      <GeneralToolBar editor={editor!} />
      <EditorContent name="lesson-expandable-body" editor={editor} />
    </div>
  );
}
