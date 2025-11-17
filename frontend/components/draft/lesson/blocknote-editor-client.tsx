"use client";

import React, { useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { blockNoteSchema } from "@/lib/blocknote/schema";
import { useTheme } from "next-themes";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { getCalloutSlashMenuItems } from "@/components/ui/blocknote/editor/slash-menu-config";
import { getQuizSlashMenuItems } from "@/components/ui/blocknote/editor/slash-menu-config";
import "@/components/ui/blocknote/editor/custom-blocknote.css";

interface BlockNoteEditorClientProps {
  initialContent?: any;
  onChange: (content: any) => void;
}

export function BlockNoteEditorClient({
  initialContent,
  onChange,
}: BlockNoteEditorClientProps) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    initialContent: initialContent || undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const handleChange = async () => {
      if (!isMounted) return;
      try {
        const content = editor.document;
        onChange(content);
      } catch (error) {
        // Silently handle errors that occur when editor is unmounted or DOM nodes are missing
        if (
          error instanceof Error &&
          (error.message.includes("node position") ||
            error.message.includes("Cannot find") ||
            error.message.includes("not mounted"))
        ) {
          // Component is unmounting or DOM has changed, ignore the error
          return;
        }
        console.error("BlockNote onChange error:", error);
      }
    };

    editor.onChange(handleChange);

    return () => {
      isMounted = false;
      // Component unmounting - editor will be cleaned up by React
    };
  }, [editor, onChange]);

  return (
    <div className="blocknote-no-link w-full rounded-lg border border-slate-200 dark:border-slate-700">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const itemsToHide = new Set(
              [
                "quote",
                "code block",
                "divider",
                "table",
                "audio",
                "file",
                "checklist",
                "toggle heading 1",
                "toggle heading 2",
                "toggle heading 3",
                "heading 4",
                "heading 5",
                "heading 6",
                "emoji",
              ].map((name) => name.toLowerCase()),
            );

            const defaultItems = getDefaultReactSlashMenuItems(editor).filter(
              (item) => !itemsToHide.has(item.title?.toLowerCase?.() || ""),
            );
            const calloutItems = getCalloutSlashMenuItems(editor);
            const quizItems = getQuizSlashMenuItems(editor);

            const allItems = [...defaultItems, ...calloutItems, ...quizItems];

            return allItems.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
}
