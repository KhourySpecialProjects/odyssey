"use client";

import React, { useEffect, useMemo } from "react";
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { blockNoteSchema } from "@/lib/blocknote/schema";
import { useTheme } from "next-themes";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import {
  getCalloutSlashMenuItems,
  getQuizSlashMenuItems,
  getLatexSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";
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
    tables: {
      splitCells: false,
      cellBackgroundColor: true,
      headers: false,
      cellTextColor: false,
    },
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

  //  formatting toolbar block types to hide
  const blockedBlockTypes = new Set([
    "Toggle Heading 1",
    "Toggle Heading 2",
    "Toggle Heading 3",
    "Heading 4",
    "Heading 5",
    "Heading 6",
    "Check List",
  ]);

  // slash menu items to hide
  const itemsToHide = new Set([
    "Quote",
    "Divider",
    "Audio",
    "Code Block",
    "File",
    "Check List",
    "Toggle Heading 1",
    "Toggle Heading 2",
    "Toggle Heading 3",
    "Heading 4",
    "Heading 5",
    "Heading 6",
    "Emoji",
  ]);

  const filteredBlockTypeItems = useMemo(
    () =>
      blockTypeSelectItems(editor.dictionary).filter(
        (item) => !blockedBlockTypes.has(item.name ?? ""),
      ),
    [editor.dictionary],
  );

  const toolbarItems = useMemo(() => {
    const defaultItems = getFormattingToolbarItems(filteredBlockTypeItems);
    return defaultItems;
  }, [filteredBlockTypeItems]);

  return (
    <div className="blocknote-no-link w-full rounded-lg border border-slate-200 dark:border-slate-700">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        slashMenu={false}
        formattingToolbar={false}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>{toolbarItems}</FormattingToolbar>
          )}
        />

        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const defaultItems = getDefaultReactSlashMenuItems(editor).filter(
              (item) => !itemsToHide.has(item.title ?? ""),
            );
            const calloutItems = getCalloutSlashMenuItems(editor);
            const quizItems = getQuizSlashMenuItems(editor);
            const latexItems = getLatexSlashMenuItems(editor);

            const allItems = [
              ...defaultItems,
              ...calloutItems,
              ...quizItems,
              ...latexItems,
            ];

            return allItems.filter(
              (item) =>
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.aliases?.some((alias) =>
                  alias.toLowerCase().includes(query.toLowerCase()),
                ),
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
}
