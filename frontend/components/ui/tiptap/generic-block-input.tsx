"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import CustomImage from "./custom-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockComponent } from "./toolbar/tools/code-tool/code-tool";
import { all, createLowlight } from "lowlight";
import GeneralToolbar from "./toolbar/general-toolbar";
import Math from "@aarkue/tiptap-math-extension";
import "katex/dist/katex.min.css";
import { EditorView } from "@tiptap/pm/view";

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
      CustomLink,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Underline,
      StartingKit,
      Math.configure({
        katexOptions: {
          throwOnError: false,
          output: "html",
          strict: false,
          trust: true,
        },
        addInlineMath: true,
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
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "cursor-text before:content-[attr(data-placeholder)] before:text-gray-500 dark:before:text-slate-300 before:absolute before:top-4 before:left-3 before:pointer-events-none before:select-none",
      }),
    ],

    onUpdate: ({ editor }) => {
      (updateContent as (content: string) => void)(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "w-full border min-h-32 prose-code:text-inherit border-slate-200 dark:border-slate-500 p-3 prose prose-lg prose-p:my-1 prose-li:my-1 prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-table:block prose-table:overflow-x-scroll rounded-b-md hover:shadow focus:shadow-lg outline-none dark:text-slate-300",
      },
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
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
      <GeneralToolbar editor={editor!} isDroplet={true} />
      <EditorContent name="lesson-generic" editor={editor} />
    </div>
  );
}
