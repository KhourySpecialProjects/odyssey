"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect } from "react";

export function DropletOverviewInput({
  initialContent,
  updateContent,
  editorActionsRef,
  onIsLinkChange,
}: {
  initialContent: string;
  updateContent: (content: string) => void;
  editorActionsRef?: React.MutableRefObject<{
    setLink: () => void;
    unsetLink: () => void;
  } | null>;
  onIsLinkChange?: (isLink: boolean) => void;
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
          "prose prose-sky w-full h-full p-8 border rounded-lg bg-[#fcfcfd] dark:bg-slate-800 border-[#D0D5DD] dark:text-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#2D7597] transition-colors outline-none cursor-text",
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

  // Wire up actions ref and isLink callback for parent use
  useEffect(() => {
    if (!editor) return;
    if (editorActionsRef) {
      editorActionsRef.current = {
        setLink,
        unsetLink: () => editor.chain().focus().unsetLink().run(),
      };
    }
  }, [editor, setLink, editorActionsRef]);

  useEffect(() => {
    onIsLinkChange?.(editorState?.isLink ?? false);
  }, [editorState?.isLink, onIsLinkChange]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      className="flex-1"
      role="textbox"
      name="droplet-overview"
      editor={editor}
    />
  );
}
