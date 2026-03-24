"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  getCodeSlashMenuItems,
  getSlideBreakSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";
import "@/components/ui/blocknote/editor/custom-blocknote.css";
import type { Block } from "@blocknote/core";

interface BlockNoteEditorClientProps {
  initialContent?: Block[];
  onChange?: (content: Block[]) => void;
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
    tables: {
      splitCells: false,
      cellBackgroundColor: true,
      headers: false,
      cellTextColor: false,
    },
  });

  // Delay initialization to ensure DOM is stable after route transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150); // Delay to ensure DOM is stable

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editable || !onChange || !isReady) return;

    let isMounted = true;
    let processingPattern = false;

    const handleChange = async () => {
      if (!isMounted || !isReady || processingPattern) return;

      try {
        const content = editor.document;

        // Check for LaTeX markdown patterns in the document
        for (const block of content) {
          // Skip custom blocks that don't support text content
          const customBlockTypes = [
            "latex",
            "image",
            "callout",
            "quiz-true-false",
            "quiz-open-ended",
            "quiz-multiple-choice",
          ];
          if (customBlockTypes.includes(block.type as string)) {
            continue;
          }

          // Try to convert block to markdown - skip if it fails or has no text
          let blockText: string;
          try {
            blockText = editor.blocksToMarkdownLossy([block]);
            if (!blockText || typeof blockText !== "string") continue;
          } catch {
            continue;
          }

          // Check for $...$ pattern (inline LaTeX) - split into blocks
          const inlineLatexMatch = blockText.match(/\$([^$]+)\$/);
          if (inlineLatexMatch && inlineLatexMatch.index !== undefined) {
            const latexContent = inlineLatexMatch[1].trim();
            if (latexContent) {
              const textBefore = blockText
                .substring(0, inlineLatexMatch.index)
                .trim();
              const textAfter = blockText
                .substring(inlineLatexMatch.index + inlineLatexMatch[0].length)
                .trim();

              const blocksToInsert: unknown[] = [];
              if (textBefore) {
                blocksToInsert.push({
                  type: "paragraph",
                  content: textBefore,
                } as unknown as Parameters<typeof editor.replaceBlocks>[1][0]);
              }
              blocksToInsert.push({
                type: "latex",
                props: {
                  content: latexContent,
                  displayMode: false,
                },
              } as unknown as Parameters<typeof editor.replaceBlocks>[1][0]);
              if (textAfter) {
                blocksToInsert.push({
                  type: "paragraph",
                  content: textAfter,
                } as unknown as Parameters<typeof editor.replaceBlocks>[1][0]);
              }

              if (blocksToInsert.length > 0) {
                processingPattern = true;
                await editor.replaceBlocks(
                  [block],
                  blocksToInsert as Parameters<typeof editor.replaceBlocks>[1],
                );
                processingPattern = false;
              }
            }
          }
        }

        // Always call onChange with the final content
        onChange(content as unknown as Block[]);
      } catch (error) {
        processingPattern = false;
        // Silently handle errors that occur when editor is unmounted or DOM nodes are missing
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

    const unsubscribe = editor.onChange(handleChange);

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [editor, onChange, isReady]);

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

  // Show loading skeleton until ready
  if (!isReady) {
    return (
      <div className="blocknote-no-link w-full rounded-lg border border-slate-200 p-4 dark:border-slate-700">
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
            const codeItems = getCodeSlashMenuItems(editor);
            const slideBreakItems = getSlideBreakSlashMenuItems(editor);

            const allItems = [
              ...defaultItems,
              ...calloutItems,
              ...quizItems,
              ...latexItems,
              ...codeItems,
              ...slideBreakItems,
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
