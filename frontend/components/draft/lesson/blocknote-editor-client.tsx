"use client";

import React, { useEffect, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { blockNoteSchema } from "@/lib/blocknote/schema";
import { useTheme } from "next-themes";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import {
  getCalloutSlashMenuItems,
  getCodeSlashMenuItems,
  getQuizSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";

interface BlockNoteEditorClientProps {
  initialContent?: any;
  onChange?: (content: any) => void;
  editable?: boolean;
}

export function BlockNoteEditorClient({
  initialContent,
  onChange,
  editable = true,
}: BlockNoteEditorClientProps) {
  const { resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    initialContent: initialContent || undefined,
  });

  // Delay rendering until component is fully mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150); // Small delay to ensure DOM is stable

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editable || !onChange || !isReady) return;

    let isMounted = true;

    const handleChange = async () => {
      if (!isMounted) return;
      try {
        const content = editor.document;
        onChange(content);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("node position") ||
            error.message.includes("Cannot find") ||
            error.message.includes("not mounted"))
        ) {
          return;
        }
        console.error("BlockNote onChange error:", error);
      }
    };

    editor.onChange(handleChange);

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, onChange, isReady]);

  if (!isReady) {
    return (
      <div className="blocknote-no-link w-full rounded-lg border border-slate-200 p-8 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="blocknote-no-link w-full rounded-lg border border-slate-200 dark:border-slate-700">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        slashMenu={false}
      >
        {/* Only show slash menu in edit mode */}
        {editable && (
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
                  "check list",
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
              const codeItems = getCodeSlashMenuItems(editor);
              const allItems = [
                ...defaultItems,
                ...calloutItems,
                ...quizItems,
                ...codeItems,
              ];

              return allItems.filter((item) =>
                item.title.toLowerCase().includes(query.toLowerCase()),
              );
            }}
          />
        )}
      </BlockNoteView>
    </div>
  );
}
