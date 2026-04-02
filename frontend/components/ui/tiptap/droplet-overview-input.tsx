"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useCallback } from "react";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Now it's safe to return early
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <TooltipProvider>
        <div className="mt-2 mb-2 flex h-7 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={setLink}
                className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
                  editorState?.isLink
                    ? "border-blue-600 bg-blue-500 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                <IconLink className="h-4 w-4" stroke={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Set link</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editorState?.isLink}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                <IconLinkOff className="h-4 w-4" stroke={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Unset link</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <EditorContent
        className="mt-4 flex-1"
        role="textbox"
        name="droplet-overview"
        editor={editor}
      />
    </div>
  );
}
