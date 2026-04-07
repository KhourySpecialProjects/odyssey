"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { blockNoteSchema } from "@/lib/blocknote/schema";
import { addRowAfter, goToNextCell, isInTable } from "prosemirror-tables";
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
  getColumnBreakSlashMenuItems,
  getNotebookCodeSlashMenuItems,
  getSandpackSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";
import { TableCellColorButton } from "@/components/ui/blocknote/editor/table-cell-color-button";
import "@/components/ui/blocknote/editor/custom-blocknote.css";
import type { AutoFormatOperation } from "@/lib/actions/auto-format-slides";
import type { Block } from "@blocknote/core";
import type { CustomBlockNoteBlock } from "@/types";
import { useSlideOverflowDetection } from "@/hooks/useSlideOverflowDetection";

const SlideOverflowContext = createContext<Set<string>>(new Set());
export const useSlideOverflow = () => useContext(SlideOverflowContext);

const knownBlockTypes = new Set(Object.keys(blockNoteSchema.blockSpecs));

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

  const safeInitialContent = initialContent?.filter((b) =>
    knownBlockTypes.has(b.type as string),
  );

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    initialContent:
      safeInitialContent && safeInitialContent.length > 0
        ? safeInitialContent
        : undefined,
    tables: {
      splitCells: false,
      cellBackgroundColor: true,
      headers: false,
      cellTextColor: false,
    },
  });

  const [documentBlocks, setDocumentBlocks] = useState<
    CustomBlockNoteBlock[] | undefined
  >();
  const overflowingBreaks = useSlideOverflowDetection(documentBlocks);

  // Delay initialization to ensure DOM is stable after route transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150); // Delay to ensure DOM is stable

    return () => clearTimeout(timer);
  }, []);

  // Intercept Tab in tables at the DOM level to prevent block nesting
  useEffect(() => {
    if (!isReady) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      // Get fresh view reference on each keypress
      const view = editor.prosemirrorView;
      if (!view || !isInTable(view.state)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!event.shiftKey) {
        if (!goToNextCell(1)(view.state, view.dispatch)) {
          addRowAfter(view.state, view.dispatch);
          goToNextCell(1)(view.state, view.dispatch);
        }
      } else {
        goToNextCell(-1)(view.state, view.dispatch);
      }
    };

    const dom = editor.prosemirrorView?.dom;
    if (!dom) return;

    dom.addEventListener("keydown", handleTab, { capture: true });
    return () => {
      dom.removeEventListener("keydown", handleTab, { capture: true });
    };
  }, [editor, isReady]);

  // Click-in-gap: insert a new paragraph when clicking the empty space between blocks
  useEffect(() => {
    if (!editable || !isReady) return;

    const dom = editor.prosemirrorView?.dom;
    if (!dom) return;

    const handleGapClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Only handle clicks on the block group container itself (the gap area),
      // not on actual block content
      if (
        !target.classList.contains("bn-block-group") &&
        !target.classList.contains("bn-editor")
      ) {
        return;
      }

      // Only handle gap clicks at the top-level editor — nested block groups
      // (lists, tables) use a different index space than editor.document.
      const editorEl = target.closest(".bn-editor");
      const blockGroup =
        editorEl?.querySelector(":scope > .bn-block-group") ||
        (target.classList.contains("bn-editor") ? target : null);
      if (!blockGroup) return;

      const blockOuters = blockGroup.querySelectorAll(
        ":scope > .bn-block-outer",
      );
      if (blockOuters.length === 0) return;

      const clickY = e.clientY;

      // Find which gap the click is in — between which two blocks.
      // Each .bn-block-outer carries a data-id matching its block in editor.document.
      let insertAfterId: string | null = null;
      let clickedOnBlock = false;
      for (let i = 0; i < blockOuters.length; i++) {
        const outer = blockOuters[i] as HTMLElement;
        const rect = outer.getBoundingClientRect();
        if (clickY < rect.top) {
          // Click is above this block — insert before it (after previous sibling)
          insertAfterId =
            i > 0
              ? (blockOuters[i - 1] as HTMLElement).dataset.id ?? null
              : null;
          break;
        }
        if (clickY <= rect.bottom) {
          // Click is on the block itself, not in a gap
          clickedOnBlock = true;
          break;
        }
        insertAfterId = outer.dataset.id ?? null;
      }

      if (clickedOnBlock) return;

      // Resolve blocks by ID so nested-group indices never pollute the lookup
      const blocks = editor.document;

      if (insertAfterId === null) {
        // Click was above the first block — nothing to insert after
        return;
      }

      const referenceIndex = blocks.findIndex((b) => b.id === insertAfterId);
      if (referenceIndex < 0) return;

      // Check if the next block is already an empty paragraph — just focus it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextBlock = blocks[referenceIndex + 1] as any;
      if (
        nextBlock &&
        nextBlock.type === "paragraph" &&
        (!nextBlock.content || nextBlock.content.length === 0)
      ) {
        editor.setTextCursorPosition(nextBlock);
        return;
      }

      const referenceBlock = blocks[referenceIndex];

      // Insert an empty paragraph after the reference block
      editor.insertBlocks(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ type: "paragraph" } as any],
        referenceBlock,
        "after",
      );

      // Focus the newly inserted block
      const updatedBlocks = editor.document;
      const newBlockIndex = referenceIndex + 1;
      if (newBlockIndex < updatedBlocks.length) {
        editor.setTextCursorPosition(updatedBlocks[newBlockIndex]);
      }
    };

    // Use the editor's root element to catch clicks on gaps
    const editorRoot = (dom.closest(".bn-editor") || dom) as HTMLElement;
    editorRoot.addEventListener("click", handleGapClick as EventListener);
    return () => {
      editorRoot.removeEventListener("click", handleGapClick as EventListener);
    };
  }, [editor, editable, isReady]);

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
        setDocumentBlocks(content as unknown as CustomBlockNoteBlock[]);
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

  // Listen for auto-format operations from the sidebar
  useEffect(() => {
    if (!isReady) return;

    const handleAutoFormat = (e: Event) => {
      const { operations } = (e as CustomEvent).detail;
      if (!operations || !Array.isArray(operations)) return;

      // Process operations in reverse order so indices stay valid
      const ops = (operations as AutoFormatOperation[])
        .slice()
        .sort((a, b) => b.afterBlockIndex - a.afterBlockIndex);

      // Deduplicate consecutive indices
      const dedupedOps: AutoFormatOperation[] = [];
      for (const op of ops) {
        const last = dedupedOps[dedupedOps.length - 1];
        if (!last || Math.abs(last.afterBlockIndex - op.afterBlockIndex) > 1) {
          dedupedOps.push(op);
        }
      }

      for (const op of dedupedOps) {
        const afterBlock = editor.document[op.afterBlockIndex];
        if (!afterBlock) continue;

        if (op.type === "insert-two-column-break") {
          // Insert column-break first (before slide-break shifts indices)
          const colAfterBlock = editor.document[op.columnBreakAfterIndex];
          if (colAfterBlock) {
            editor.insertBlocks(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [{ type: "column-break" as any }],
              colAfterBlock,
              "after",
            );
          }
          // Insert slide-break with two-column layout
          /* eslint-disable @typescript-eslint/no-explicit-any */
          editor.insertBlocks(
            [
              {
                type: "slide-break" as any,
                props: { nextSlideLayout: "two-columns" } as any,
              },
            ],
            afterBlock,
            "after",
          );
          /* eslint-enable @typescript-eslint/no-explicit-any */
        } else {
          editor.insertBlocks(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [{ type: "slide-break" as any }],
            afterBlock,
            "after",
          );
        }
      }
    };

    const handleBlocksRequest = () => {
      window.dispatchEvent(
        new CustomEvent("auto-format-blocks-response", {
          detail: { blocks: editor.document },
        }),
      );
    };

    window.addEventListener("auto-format-slides", handleAutoFormat);
    window.addEventListener("auto-format-blocks-request", handleBlocksRequest);
    return () => {
      window.removeEventListener("auto-format-slides", handleAutoFormat);
      window.removeEventListener(
        "auto-format-blocks-request",
        handleBlocksRequest,
      );
    };
  }, [editor, isReady]);

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
    <SlideOverflowContext.Provider value={overflowingBreaks}>
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
              <FormattingToolbar>
                {toolbarItems}
                <TableCellColorButton />
              </FormattingToolbar>
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
              const columnBreakItems = getColumnBreakSlashMenuItems(editor);
              const notebookCodeItems = getNotebookCodeSlashMenuItems(editor);
              const sandpackItems = getSandpackSlashMenuItems(editor);

              const allItems = [
                ...defaultItems,
                ...calloutItems,
                ...quizItems,
                ...latexItems,
                ...codeItems,
                ...sandpackItems,
                ...slideBreakItems,
                ...columnBreakItems,
                ...notebookCodeItems,
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
    </SlideOverflowContext.Provider>
  );
}
