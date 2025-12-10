"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useCallback } from "react";

export function DropletOverviewInput({
  initialContent,
  updateContent,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
}) {
  const editor = useEditor({
    editable: true,
    extensions: [
      Document,
      Paragraph,
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-8 before:left-8 before:pointer-events-none before:select-none",
      }),
      Text,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
      }),
    ],

    onUpdate: ({ editor }) => {
      updateContent(editor.getHTML());
    },

    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sky w-full max-w-2xl p-8 mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:text-slate-300 dark:border-slate-500 hover:shadow focus:shadow-lg outline-none",
      },
    },
    immediatelyRender: false,
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    let url = window.prompt("URL", previousUrl || "");

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (!url.match(/^https?:\/\//)) {
      url = "https://" + url;
    }

    // update link
    try {
      editor.chain().focus().setLink({ href: url }).run();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to set link";
      alert(errorMessage);
    }
  }, [editor]);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx?.editor) {
        return { isLink: false };
      }
      return {
        isLink: ctx.editor.isActive("link"),
      };
    },
  });

  // Now it's safe to return early
  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="control-group mt-2 mb-2">
        <div className="button-group flex gap-2">
          <button
            onClick={setLink}
            className={`rounded border px-3 py-1 transition-colors ${
              editorState?.isLink
                ? "border-blue-600 bg-blue-500 text-white"
                : "border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
            }`}
          >
            Set link
          </button>
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editorState?.isLink}
            className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Unset link
          </button>
        </div>
      </div>
      <EditorContent role="textbox" name="droplet-overview" editor={editor} />
    </>
  );
}
