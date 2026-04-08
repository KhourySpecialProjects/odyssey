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
import "@/components/ui/blocknote/editor/custom-blocknote.css";
import type { AutoFormatOperation } from "@/lib/actions/auto-format-slides";
import type { Block } from "@blocknote/core";
import type { CustomBlockNoteBlock } from "@/types";
import { useSlideOverflowDetection } from "@/hooks/useSlideOverflowDetection";

const SlideOverflowContext = createContext<Set<string>>(new Set());
export const useSlideOverflow = () => useContext(SlideOverflowContext);

const knownBlockTypes = new Set(Object.keys(blockNoteSchema.blockSpecs));

const CUSTOM_BLOCK_TYPES = new Set([
  "latex",
  "image",
  "callout",
  "quiz-true-false",
  "quiz-open-ended",
  "quiz-multiple-choice",
  "code-block",
]);

// Code fence language aliases → code block language values
const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  cs: "csharp",
  "c++": "cpp",
};

function resolveLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  return LANG_ALIASES[lower] || lower;
}

function getBlockPlainText(b: unknown): string | undefined {
  const c = (b as Record<string, unknown>).content;
  if (!Array.isArray(c)) return undefined;
  return c
    .map((item: Record<string, unknown>) =>
      typeof item?.text === "string" ? item.text : "",
    )
    .join("");
}

// Formatting toolbar block types to hide
const BLOCKED_BLOCK_TYPES = new Set([
  "Toggle Heading 1",
  "Toggle Heading 2",
  "Toggle Heading 3",
  "Heading 4",
  "Heading 5",
  "Heading 6",
  "Check List",
]);

// Slash menu items to hide
const ITEMS_TO_HIDE = new Set([
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

  useEffect(() => {
    if (!editable || !onChange || !isReady) return;

    let isMounted = true;
    let processingPattern = false;

    const handleChange = async () => {
      if (!isMounted || !isReady || processingPattern) return;

      try {
        const content = editor.document;

        let patternApplied = false;

        for (let blockIdx = 0; blockIdx < content.length; blockIdx++) {
          const block = content[blockIdx];
          if (CUSTOM_BLOCK_TYPES.has(block.type as string)) continue;

          // Check for code fence patterns before markdown conversion
          const plain = getBlockPlainText(block)?.trim();
          if (plain && plain.startsWith("```")) {
            // Single-line: ```content``` — must have closing backticks
            // ```js food``` → language=javascript, code=food
            // ```food``` → language=javascript, code=food (no space = all code)
            const singleLineMatch = plain.match(/^```(.+?)```$/);
            if (singleLineMatch) {
              const inner = singleLineMatch[1];
              const langCodeMatch = inner.match(/^(\w+)\s+(.+)$/);
              const language = langCodeMatch
                ? resolveLanguage(langCodeMatch[1])
                : "javascript";
              const code = langCodeMatch
                ? langCodeMatch[2].trim()
                : inner.trim();

              processingPattern = true;
              await editor.replaceBlocks(
                [block],
                [
                  {
                    type: "code-block",
                    props: { language, code },
                  } as unknown as Parameters<typeof editor.replaceBlocks>[1][0],
                ],
              );
              processingPattern = false;
              patternApplied = true;
              break;
            }

            // Multi-line fence: only trigger when a closing ``` exists
            const openFenceMatch = plain.match(/^```(\w*)$/);
            if (openFenceMatch) {
              const language = openFenceMatch[1]
                ? resolveLanguage(openFenceMatch[1])
                : "javascript";

              const codeLines: string[] = [];
              let closingIndex = -1;
              const maxLookahead = Math.min(blockIdx + 51, content.length);
              for (let i = blockIdx + 1; i < maxLookahead; i++) {
                const nextBlock = content[i];
                if (CUSTOM_BLOCK_TYPES.has(nextBlock.type as string)) break;
                const nextPlain = getBlockPlainText(nextBlock)?.trim();
                if (nextPlain === undefined) break;
                if (nextPlain === "```") {
                  closingIndex = i;
                  break;
                }
                codeLines.push(nextPlain);
              }

              if (closingIndex !== -1) {
                const blocksToReplace = content.slice(
                  blockIdx,
                  closingIndex + 1,
                );
                processingPattern = true;
                await editor.replaceBlocks(blocksToReplace, [
                  {
                    type: "code-block",
                    props: {
                      language,
                      code: codeLines.join("\n"),
                    },
                  } as unknown as Parameters<typeof editor.replaceBlocks>[1][0],
                ]);
                processingPattern = false;
                patternApplied = true;
                break;
              }
            }
          }

          // Check for $...$ pattern (inline LaTeX) using already-extracted plain text
          if (!plain) continue;
          const inlineLatexMatch = plain.match(/\$([^$]+)\$/);
          if (inlineLatexMatch && inlineLatexMatch.index !== undefined) {
            const latexContent = inlineLatexMatch[1].trim();
            if (latexContent) {
              const textBefore = plain
                .substring(0, inlineLatexMatch.index)
                .trim();
              const textAfter = plain
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

        // Skip onChange if a pattern was applied — replaceBlocks triggers another cycle
        if (patternApplied) return;

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

  const filteredBlockTypeItems = useMemo(
    () =>
      blockTypeSelectItems(editor.dictionary).filter(
        (item) => !BLOCKED_BLOCK_TYPES.has(item.name ?? ""),
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
              <FormattingToolbar>{toolbarItems}</FormattingToolbar>
            )}
          />

          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              const defaultItems = getDefaultReactSlashMenuItems(editor).filter(
                (item) => !ITEMS_TO_HIDE.has(item.title ?? ""),
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
