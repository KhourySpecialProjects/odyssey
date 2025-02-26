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
          "prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit p-2 max-w-full min-h-32 border rounded-b-md border-slate-200 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none",
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
