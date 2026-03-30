"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings, isAuthorizedUserAdmin } from "@/lib/utils";
import {
  User,
  Droplet,
  Lesson,
  AuthorizedUser,
  CustomBlockNoteBlock,
} from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./generic-block-renderer";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { toast } from "sonner";
import { Highlight } from "@/types";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  createHighlight,
  deleteHighlight,
  getHighlights,
  getHighlightsForLesson,
} from "@/lib/requests/highlights";
import { Block } from "@/types";
import { GenericBlock } from "@/components/draft/lesson/blocks/generic";
import { markLessonAsComplete } from "@/lib/requests/lesson";
import posthog from "posthog-js";
import katex from "katex";
import "katex/dist/katex.min.css";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "lessons" | "name">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
  onUpdate: () => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export interface Heading {
  text: string;
  level: number;
}

interface HighlightResponseItem {
  id: number;
  attributes: {
    text: string;
    position: number;
    color: string;
  };
}

type BlockNoteTextStyles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  latex?: boolean;
};

type BlockNoteInlineContent = {
  type?: string;
  text?: string;
  styles?: BlockNoteTextStyles;
};

// Strapi Blocks text node (minimal subset we care about)
type StrapiBlocksTextNode = {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

type BlockNoteListItem = {
  type: string;
  content?: BlockNoteInlineContent[];
  children?: BlockNoteListItem[];
};

type BlockNoteTableCell = {
  content?: BlockNoteInlineContent[];
  props?: {
    backgroundColor?: string;
  };
};

type BlockNoteTableRow = {
  cells: BlockNoteTableCell[];
};

// Convert BlockNote string ID to a deterministic number for database storage
function blockNoteIdToNumber(blockId: string): number {
  // Simple hash function - sum character codes
  let hash = 0;
  for (let i = 0; i < blockId.length; i++) {
    const char = blockId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function renderTextWithStyles(
  text: string,
  styles?: BlockNoteTextStyles,
): string {
  if (!styles) return text;

  if (styles.latex) {
    return `$${text}$`;
  }

  let styledText = text;
  if (styles.bold) styledText = `<strong>${styledText}</strong>`;
  if (styles.italic) styledText = `<em>${styledText}</em>`;
  if (styles.underline) styledText = `<u>${styledText}</u>`;
  if (styles.code) styledText = `<code>${styledText}</code>`;

  return styledText;
}

// Helper function to convert inline content to HTML
function convertInlineContentToHtml(
  inlineContent: BlockNoteInlineContent[],
): string {
  return (
    inlineContent
      .map((contentItem) => {
        if (contentItem.type === "text") {
          const text = contentItem.text ?? "";
          return renderTextWithStyles(text, contentItem.styles);
        }
        return "";
      })
      .join("") || ""
  );
}

// Helper: convert BlockNote inline content into Strapi Blocks text nodes
function convertInlineContentToStrapiBlocks(
  inlineContent: BlockNoteInlineContent[],
): StrapiBlocksTextNode[] {
  return inlineContent.map((contentItem) => {
    const text = contentItem.text ?? "";

    // Base Strapi "text" node
    const node: StrapiBlocksTextNode = {
      type: "text",
      text,
    };

    const styles = contentItem.styles;
    if (styles) {
      if (styles.bold) node.bold = true;
      if (styles.italic) node.italic = true;
      if (styles.underline) node.underline = true;
      if (styles.code) node.code = true;

      // For now we keep LaTeX as plain text – it's rendered later by GenericBlockRenderer
    }

    return node;
  });
}

// Helper function to convert inline content to plain text (for markdown)
function convertInlineContentToText(
  inlineContent: BlockNoteInlineContent[],
): string {
  return (
    inlineContent
      .map((contentItem) => {
        if (contentItem.type === "text") {
          return contentItem.text ?? "";
        }
        return "";
      })
      .join("") || ""
  );
}

// Helper function to convert a numbered list item and its children recursively
function convertNumberedListItem(
  item: BlockNoteListItem,
  depth: number = 0,
): string {
  const inlineContent = item.content ?? [];
  const textContent = convertInlineContentToHtml(inlineContent);

  const children = item.children ?? [];

  // Filter for numbered list items and also check for any blocks that might represent nested lists
  const nestedListItems = children.filter(
    (child) => child.type === "numberedListItem",
  );

  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
    // Recursively convert nested list items
    const nestedListContent = nestedListItems
      .map((nestedItem) => convertNumberedListItem(nestedItem, depth + 1))
      .join("");
    nestedListHtml = `<ol class="list-decimal list-outside ml-6 my-1">${nestedListContent}</ol>`;
  } else if (children.length > 0) {
    const allChildrenContent = children
      .map((child) => {
        if (child.type === "numberedListItem") {
          return convertNumberedListItem(child, depth + 1);
        }
        // For other block types, convert their content
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
      // If we have content from children, wrap it appropriately
      nestedListHtml = allChildrenContent;
    }
  }

  return `<li>${textContent}${nestedListHtml}</li>`;
}

// Helper function to convert a bullet list item and its children recursively
function convertBulletListItem(
  item: BlockNoteListItem,
  depth: number = 0,
): string {
  const inlineContent = item.content ?? [];
  const textContent = convertInlineContentToHtml(inlineContent);

  // Check if this item has children (nested list items)
  // BlockNote stores nested items in the children array
  const children = item.children ?? [];

  // Filter for bullet list items and also check for any blocks that might represent nested lists
  const nestedListItems = children.filter(
    (child) => child.type === "bulletListItem",
  );

  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
    // Recursively convert nested list items
    const nestedListContent = nestedListItems
      .map((nestedItem) => convertBulletListItem(nestedItem, depth + 1))
      .join("");
    nestedListHtml = `<ul class="list-disc list-outside ml-6 my-1">${nestedListContent}</ul>`;
  } else if (children.length > 0) {
    const allChildrenContent = children
      .map((child) => {
        if (child.type === "bulletListItem") {
          return convertBulletListItem(child, depth + 1);
        }
        // For other block types, convert their content
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
      // If we have content from children, wrap it appropriately
      nestedListHtml = allChildrenContent;
    }
  }

  return `<li>${textContent}${nestedListHtml}</li>`;
}

function convertBlockNoteToV1Blocks(blocksV2: CustomBlockNoteBlock[]): Block[] {
  if (!Array.isArray(blocksV2)) return [];

  // First, group consecutive numbered list items together
  const processedBlocks: Block[] = [];
  let i = 0;

  while (i < blocksV2.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blockAny = blocksV2[i] as any;

    // Check for empty paragraphs FIRST, regardless of block type context
    // This ensures empty paragraphs between any block types are preserved for spacing
    if (blockAny.type === "paragraph") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inlineContent = (blockAny.content ?? []) as any[];
      const textContent = convertInlineContentToHtml(inlineContent);
      const isEmpty = !textContent || textContent.trim() === "";

      // If empty paragraph, render each empty paragraph as a separate block
      // This creates proportional spacing - more empty paragraphs = more spacing
      if (isEmpty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emptyParagraphBlocks: any[] = [];
        let j = i;

        // Collect consecutive empty paragraphs
        while (j < blocksV2.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nextBlock = blocksV2[j] as any;
          if (nextBlock.type === "paragraph") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nextInlineContent = (nextBlock.content ?? []) as any[];
            const nextTextContent =
              convertInlineContentToHtml(nextInlineContent);
            const nextIsEmpty =
              !nextTextContent || nextTextContent.trim() === "";

            if (nextIsEmpty) {
              emptyParagraphBlocks.push(nextBlock);
              j++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        // Render each empty paragraph as a separate block
        // Each empty paragraph creates spacing proportional to the number of empty lines
        // Using a div with min-height to create visible spacing that matches BlockNote editor
        emptyParagraphBlocks.forEach((emptyBlock, index) => {
          const blockId = emptyBlock.id
            ? blockNoteIdToNumber(emptyBlock.id)
            : i + index;
          processedBlocks.push({
            __component: "droplets.generic",
            id: blockId,
            content:
              '<div class="empty-paragraph-spacing" style="min-height: 1.5rem;"></div>',
          });
        });

        i = j;
        continue;
      }

      // Group consecutive non-empty paragraphs together
      const paragraphBlocks: CustomBlockNoteBlock[] = [];
      const sourceBlockIds: number[] = [];
      let j = i;

      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j];
        if (nextBlock.type === "paragraph") {
          const nextInlineContent = (nextBlock.content ??
            []) as BlockNoteInlineContent[];
          const nextTextContent = convertInlineContentToHtml(nextInlineContent);
          const nextIsEmpty = !nextTextContent || nextTextContent.trim() === "";

          // Stop grouping if we hit an empty paragraph
          if (nextIsEmpty) {
            break;
          }

          paragraphBlocks.push(nextBlock);
          // Store source block ID
          if (nextBlock.id) {
            sourceBlockIds.push(blockNoteIdToNumber(nextBlock.id));
          }
          j++;
        } else {
          break;
        }
      }

      const paragraphsHtml = paragraphBlocks
        .map((p) => {
          const pInlineContent = (p.content ?? []) as BlockNoteInlineContent[];
          const pTextContent = convertInlineContentToHtml(pInlineContent);
          return pTextContent ? `<p>${pTextContent}</p>` : "";
        })
        .filter(Boolean)
        .join("");

      if (paragraphsHtml) {
        // Use first block's ID as primary, store all in sourceBlockIds
        const primaryId = paragraphBlocks[0]?.id
          ? blockNoteIdToNumber(paragraphBlocks[0].id)
          : i;

        processedBlocks.push({
          __component: "droplets.generic",
          id: primaryId,
          sourceBlockIds:
            sourceBlockIds.length > 1 ? sourceBlockIds : undefined,
          content: paragraphsHtml,
        });
      }

      i = j;
      continue;
    }

    // Skip quote blocks
    if (blockAny.type === "quote") {
      // Convert quote to paragraph to avoid losing content
      const quoteContent = (blockAny.content ?? []) as BlockNoteInlineContent[];
      const textContent = convertInlineContentToHtml(quoteContent);
      if (textContent) {
        const blockId = blockAny.id ? blockNoteIdToNumber(blockAny.id) : i;
        processedBlocks.push({
          __component: "droplets.generic",
          id: blockId,
          content: `<p>${textContent}</p>`,
        });
      }
      i++;
      continue;
    }

    // If this is a numbered list item, collect all consecutive ones at the same level
    if (blockAny.type === "numberedListItem") {
      const listItems: CustomBlockNoteBlock[] = [];
      const sourceBlockIds: number[] = [];
      let j = i;

      // Collect consecutive numbered list items at the root level
      // Skip quote blocks that might be interspersed
      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j];
        if (nextBlock.type === "numberedListItem") {
          listItems.push(nextBlock);
          // Store source block ID
          if (nextBlock.id) {
            sourceBlockIds.push(blockNoteIdToNumber(nextBlock.id));
          }
          j++;
        } else if (nextBlock.type === "quote") {
          // Skip quote blocks - they might be incorrectly inserted
          j++;
        } else {
          break;
        }
      }

      // Convert all list items to HTML (handles nesting recursively)
      const listItemHtml = listItems
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => convertNumberedListItem(item, 0))
        .join("");

      if (listItemHtml) {
        // Use first block's ID as primary, store all in sourceBlockIds
        const primaryId = listItems[0]?.id
          ? blockNoteIdToNumber(listItems[0].id)
          : i;

        processedBlocks.push({
          __component: "droplets.generic",
          id: primaryId,
          sourceBlockIds:
            sourceBlockIds.length > 1 ? sourceBlockIds : undefined,
          content: `<ol class="list-decimal list-outside ml-6 my-2 space-y-1">${listItemHtml}</ol>`,
        });
      }

      i = j; // Skip the processed items
      continue;
    }

    // If this is a bullet list item, collect all consecutive ones at the same level
    if (blockAny.type === "bulletListItem") {
      const listItems: CustomBlockNoteBlock[] = [];
      const sourceBlockIds: number[] = [];
      let j = i;

      // Collect consecutive bullet list items at the root level
      // Skip quote blocks that might be interspersed
      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j];
        if (nextBlock.type === "bulletListItem") {
          listItems.push(nextBlock);
          // Store source block ID
          if (nextBlock.id) {
            sourceBlockIds.push(blockNoteIdToNumber(nextBlock.id));
          }
          j++;
        } else if (nextBlock.type === "quote") {
          // Skip quote blocks - they might be incorrectly inserted
          j++;
        } else {
          break;
        }
      }

      // Convert all list items to HTML (handles nesting recursively)
      const listItemHtml = listItems
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => convertBulletListItem(item, 0))
        .join("");

      if (listItemHtml) {
        // Use first block's ID as primary, store all in sourceBlockIds
        const primaryId = listItems[0]?.id
          ? blockNoteIdToNumber(listItems[0].id)
          : i;

        processedBlocks.push({
          __component: "droplets.generic",
          id: primaryId,
          sourceBlockIds:
            sourceBlockIds.length > 1 ? sourceBlockIds : undefined,
          content: `<ul class="list-disc list-outside ml-6 my-2 space-y-1">${listItemHtml}</ul>`,
        });
      }

      i = j; // Skip the processed items
      continue;
    }

    // For non-numbered-list blocks, process normally
    const convertedBlock = convertSingleBlock(blockAny, i);
    if (convertedBlock !== null) {
      processedBlocks.push(convertedBlock);
    }
    i++;
  }

  return processedBlocks.filter((block): block is Block => block !== null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertSingleBlock(blockAny: any, blockIndex: number): Block | null {
  // Use BlockNote block ID if available, otherwise fall back to index
  const blockId = blockAny.id ? blockNoteIdToNumber(blockAny.id) : blockIndex;

  switch (blockAny.type) {
    case "heading":
    case "paragraph": {
      const inlineContent = (blockAny.content ??
        []) as BlockNoteInlineContent[];
      const textContent = convertInlineContentToHtml(inlineContent);

      const headingLevel = Number(blockAny.props?.level) || 1;
      const htmlContent =
        blockAny.type === "heading"
          ? `<h${headingLevel}>${textContent}</h${headingLevel}>`
          : `<p>${textContent}</p>`;

      return {
        __component: "droplets.generic",
        id: blockId,
        content: htmlContent,
      };
    }

    case "callout": {
      const calloutColorMap: Record<string, string> = {
        warning: "bg-red-300",
        question: "bg-blue-300",
        important: "bg-orange-300",
        definition: "bg-green-300",
        "more-information": "bg-purple-300",
        caution: "bg-amber-300",
        default: "bg-sky-50 dark:bg-sky-200",
      };

      const calloutContent = (blockAny.content ??
        []) as BlockNoteInlineContent[];
      const calloutChildren =
        convertInlineContentToStrapiBlocks(calloutContent);

      return {
        __component: "droplets.callout",
        id: blockId,
        content: [
          {
            type: "paragraph",
            children: calloutChildren,
          },
        ],
        color:
          calloutColorMap[blockAny.props?.calloutType] ||
          calloutColorMap.default,
        type: blockAny.props?.calloutType || "info",
        iconEnabled: true,
      };
    }

    case "quiz-multiple-choice": {
      // Parse options if it's a string
      let options: { text?: string; isCorrect?: boolean }[] = [];

      if (typeof blockAny.props?.options === "string") {
        try {
          options = JSON.parse(blockAny.props.options);
        } catch {
          options = [];
        }
      } else if (Array.isArray(blockAny.props?.options)) {
        options = blockAny.props.options;
      }

      return {
        __component: "droplets.quiz",
        questions: [
          {
            id: blockId,
            content: blockAny.props?.question || "",
            answerOptions: options.map((opt, optionIndex) => ({
              id: blockIndex * 100 + optionIndex,
              content: opt.text || "",
              isCorrect: !!opt.isCorrect,
            })),
          },
        ],
      };
    }

    case "quiz-true-false": {
      return {
        __component: "droplets.quiz",
        questions: [
          {
            id: blockId,
            content: blockAny.props?.question || "",
            answerOptions: [
              {
                id: blockIndex * 10 + 1,
                content: "True",
                isCorrect: blockAny.props?.correctAnswer === true,
              },
              {
                id: blockIndex * 10 + 2,
                content: "False",
                isCorrect: blockAny.props?.correctAnswer === false,
              },
            ],
          },
        ],
      };
    }

    case "quiz-open-ended": {
      return {
        __component: "droplets.open-ended-quiz",
        questions: [
          {
            id: blockId,
            content: blockAny.props?.question || "",
            correctAnswer: blockAny.props?.correctAnswer || "",
          },
        ],
      };
    }

    case "video": {
      let embedUrl = blockAny.props?.url || "";

      // Convert YouTube URLs to embed format
      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
        // Extract video ID from various YouTube URL formats
        let videoId = "";
        if (embedUrl.includes("youtu.be/")) {
          videoId = embedUrl.split("youtu.be/")[1].split("?")[0];
        } else if (embedUrl.includes("youtube.com")) {
          const urlParams = new URLSearchParams(embedUrl.split("?")[1]);
          videoId = urlParams.get("v") || "";
        }

        if (videoId) {
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }

      return {
        __component: "droplets.video",
        id: blockId,
        url: embedUrl,
      };
    }

    case "image": {
      // Convert to generic block with img tag so it renders in GenericBlockRenderer
      return {
        __component: "droplets.generic",
        id: blockId,
        content: `<img src="${blockAny.props?.url || ""}" alt="${blockAny.props?.name || ""}" class="rounded-md" />`,
      };
    }

    case "latex": {
      // Convert LaTeX block to generic block with rendered LaTeX
      const latexContent = blockAny.props?.content || "";
      const isDisplayMode = blockAny.props?.displayMode || false;

      if (!latexContent) {
        return null;
      }

      try {
        const rendered = katex.renderToString(latexContent, {
          throwOnError: false,
          displayMode: isDisplayMode,
        });

        const wrapperClass = isDisplayMode
          ? "my-4 flex justify-center"
          : "inline-block";

        return {
          __component: "droplets.generic",
          id: blockId,
          content: `<div class="${wrapperClass}">${rendered}</div>`,
        };
      } catch {
        // Fallback: show raw LaTeX if rendering fails
        const escapedLatex = latexContent
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        return {
          __component: "droplets.generic",
          id: blockId,
          content: `<div class="rounded bg-red-50 p-2 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-mono text-sm">LaTeX Error: ${escapedLatex}</div>`,
        };
      }
    }

    case "table": {
      const tableContent = blockAny.content;
      if (!tableContent || !tableContent.rows) {
        return null;
      }

      const hasHeaders = blockAny.props?.headers !== false; // Default to true if not specified
      const cellBackgroundColors: Record<string, string> = {};

      // Convert table to markdown (GFM format)
      const markdownRows: string[] = [];

      tableContent.rows.forEach((row: BlockNoteTableRow, rowIndex: number) => {
        const cells = row.cells.map((cell, cellIndex: number) => {
          const cellContent = cell.content ?? [];
          const cellText = convertInlineContentToText(cellContent);

          // Store background color if present
          if (cell.props?.backgroundColor) {
            const key = `${rowIndex}-${cellIndex}`;
            cellBackgroundColors[key] = cell.props.backgroundColor;
          }

          // Escape pipe characters in cell content
          return cellText.replace(/\|/g, "\\|").trim();
        });

        markdownRows.push(`| ${cells.join(" | ")} |`);

        // Add separator row after header row
        if (hasHeaders && rowIndex === 0) {
          const separator = cells.map(() => "---").join(" | ");
          markdownRows.push(`| ${separator} |`);
        }
      });

      const tableMarkdown = markdownRows.join("\n");

      // Store table data with a special marker so we can identify it in the renderer
      // Note: We store both markdown (for future use) and the full HTML data for rendering
      const tableData = {
        markdown: tableMarkdown,
        hasHeaders,
        cellBackgroundColors,
        rows: tableContent.rows.map(
          (row: BlockNoteTableRow, rowIndex: number) => ({
            cells: row.cells.map((cell, cellIndex: number) => {
              const cellContent = cell.content ?? [];
              return {
                content: convertInlineContentToHtml(cellContent),
                backgroundColor: cell.props?.backgroundColor || null,
                rowIndex,
                cellIndex,
              };
            }),
          }),
        ),
      };

      return {
        __component: "droplets.generic",
        id: blockId,
        content: `<!--TABLE_START-->${JSON.stringify(tableData)}<!--TABLE_END-->`,
      };
    }

    case "code-block": {
      // Code blocks need special handling - render them as a custom component
      // We'll create a simple code display block that respects the editable/runnable props
      const language = blockAny.props?.language || "javascript";
      const code = blockAny.props?.code || "";
      const editable = blockAny.props?.editable || false;
      const runnable = blockAny.props?.runnable || false;

      // For now, convert to a generic block with a special data attribute
      // that the GenericBlockRenderer can detect and render specially
      return {
        __component: "droplets.code-block",
        id: blockIndex,
        language,
        code,
        editable,
        runnable,
      };
    }

    default:
      return null;
  }
}

export function LessonRenderer({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author = false,
  authUser,
  onUpdate,
  expanded,
  setExpanded,
}: LessonRendererProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const firedMilestones = useRef<Set<number>>(new Set());

  // Move all hooks before any early returns
  useEffect(() => {
    const fetchHighlights = async () => {
      const response = await getHighlightsForLesson(lesson.id);
      if (response.data) {
        const formattedHighlights = response.data.map(
          (item: HighlightResponseItem) => ({
            ...item.attributes,
            id: item.id,
          }),
        );
        setHighlights(formattedHighlights);
      }
    };
    fetchHighlights();
  }, [lesson.id]);

  const displayBlocks =
    lesson.blocksVersion === "v2" && lesson.blocksV2
      ? convertBlockNoteToV1Blocks(lesson.blocksV2)
      : lesson.blocks;

  let headings: Heading[] = [];
  displayBlocks
    .filter((b: Block) => b.__component === "droplets.generic")
    .forEach((b: Block) => {
      headings = headings.concat(extractHeadings((b as GenericBlock).content));
    });

  const [canProceed, setCanProceed] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | undefined>(
    displayBlocks[0]?.id,
  );

  useEffect(() => {
    const checkQuizAnswers = () => {
      const questions = document.querySelectorAll('[role="question"]');
      if (!questions) {
        setCanProceed(true);
        return;
      }
      const completedQuizQuestions =
        document.querySelectorAll('[role="status"]');
      if (questions.length !== completedQuizQuestions.length) {
        setCanProceed(false);
        return;
      }

      const allAnsweredCorrectly = Array.from(completedQuizQuestions).every(
        (question) => {
          const resultBadge = question.textContent;
          return resultBadge?.toLowerCase().includes("right");
        },
      );

      setCanProceed(allAnsweredCorrectly);
    };

    checkQuizAnswers();
    const observer = new MutationObserver(checkQuizAnswers);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id"],
    });

    return () => observer.disconnect();
  }, []);

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);
  const isNotEnrolled = !enrollmentId && !author && !isAdmin;

  useEffect(() => {
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      window.posthog = posthog;

      if (authUser?.id) {
        posthog.identify(authUser.id.toString());
      }
    }
  }, [authUser?.id]);

  useEffect(() => {
    firedMilestones.current = new Set();
  }, [lesson.id]);

  useEffect(() => {
    if (!enrollmentId) return;

    const MILESTONES = [25, 50, 75, 100];

    function handleScroll() {
      const el = lessonContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      const scrolled = window.innerHeight - rect.top;
      const pct = Math.min(100, Math.max(0, (scrolled / rect.height) * 100));
      for (const milestone of MILESTONES) {
        if (pct >= milestone && !firedMilestones.current.has(milestone)) {
          firedMilestones.current.add(milestone);
          posthog.capture("lesson_scroll_depth", {
            percent: milestone,
            lesson_id: lesson.id,
            lesson_name: lesson.name,
            droplet_id: droplet.id,
            user_id: authUser?.id,
          });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lesson.id, droplet.id, enrollmentId, authUser?.id]);

  if (isNotEnrolled) {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Enrollment Required
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You must enroll in this droplet to access lessons.
          </p>
        </div>
      </div>
    );
  }

  const handleHighlight = async (
    highlight: Highlight,
    isWithNote?: boolean,
  ) => {
    const response = await createHighlight({
      data: {
        text: highlight.text,
        position: highlight.position,
        color: highlight.color,
        lesson: lesson.id,
        authorized_user: authUser?.id,
        blockId: highlight.blockId,
      },
    });

    if (response.data) {
      const formattedHighlight = {
        ...response.data.attributes,
        id: response.data.id,
      };
      setHighlights((prev) => [...prev, formattedHighlight]);
      if (!(isWithNote === true)) {
        toast.success("Highlight saved");
      }
    } else {
      toast.error("Failed to save highlight");
    }
  };

  const handleDeleteHighlight = async (highlightId: number) => {
    const response = await deleteHighlight(highlightId, authUser!.id);
    if (response && !response.error) {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
      toast.success("Highlight removed");
    } else {
      toast.error("Failed to remove highlight");
    }
  };

  const handleCreateNote = async (notePos: number, text: string) => {
    setExpanded(true);
    const enrollment = await getEnrollByID(String(enrollmentId), {
      fields: ["id"],
      populate: {},
    });

    if (authUser) {
      const highlight = await getHighlights(authUser.id, text);
      const result = await createNote(
        lesson,
        enrollment,
        notePos,
        authUser.id,
        highlight[0],
      );
      if (result.success) {
        toast.success("Note created");
      } else {
        toast.error("Failed to create note");
      }
    }

    onUpdate();
  };

  const currentLessonOrder = (droplet.lessons ?? []).find(
    (dl) => dl.id === lesson.id,
  )?.orderIndex;

  const previousLesson = (droplet.lessons ?? []).find(
    (dl) => dl.orderIndex === (currentLessonOrder as number) - 1,
  );

  const isLocked =
    previousLesson &&
    !completedLessonIds.includes(previousLesson.id) &&
    !author &&
    !(user && isAuthorizedUserAdmin(user.roles));

  if (isLocked) {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900">Lesson Locked</h2>
          <p className="mt-2 text-slate-600">
            Complete {previousLesson.name} to unlock this content.
          </p>
        </div>
      </div>
    );
  }

  async function handleMarkAsComplete() {
    if (!enrollmentId) {
      return;
    }

    posthog.capture("mark_as_complete_clicked", {
      lesson_id: lesson.id,
      lesson_name: lesson.name,
      droplet_id: droplet.id,
      enrollment_id: enrollmentId,
      user_id: authUser?.id,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    startTransition(async () => {
      const success = await markLessonAsComplete(
        enrollmentId,
        completedLessonIds,
        lesson.id,
      );
      if (success) {
        completedLessonIds.push(lesson.id);

        posthog.capture("lesson_completed", {
          lesson_id: lesson.id,
          lesson_name: lesson.name,
          droplet_id: droplet.id,
          enrollment_id: enrollmentId,
          user_id: authUser?.id,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });

        await router.refresh();
      }
    });
  }

  return (
    <div
      ref={lessonContentRef}
      className="mx-auto w-full min-w-[300px] py-8 md:min-w-[700px]"
    >
      <div className="relative mx-auto w-full max-w-2xl xl:py-8">
        <h1 className="text-6xl font-extrabold text-balance">{lesson.name}</h1>

        <div className="mt-8 space-y-2">
          {displayBlocks.map((b: Block, i: number) => (
            <LessonBlockRenderer
              key={i}
              block={b}
              lessonId={lesson.id}
              dropletId={droplet.id}
              dropletName={droplet.name}
              lessonName={lesson.name}
              userId={authUser?.id}
              highlights={highlights}
              onHighlight={handleHighlight}
              onDeleteHighlight={handleDeleteHighlight}
              onNote={handleCreateNote}
              enrollmentId={enrollmentId}
              expanded={expanded}
              setExpanded={setExpanded}
              activeBlock={activeBlock}
              setActiveBlock={(id: number) => setActiveBlock(id)}
              author={author}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleMarkAsComplete}
            disabled={
              isPending ||
              !enrollmentId ||
              completedLessonIds.includes(lesson.id) ||
              !canProceed
            }
            className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isPending
              ? "Marking as complete..."
              : completedLessonIds.includes(lesson.id)
                ? "Completed"
                : "Mark as complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LessonBlockRenderer({
  block,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  expanded,
  setExpanded,
  activeBlock,
  setActiveBlock,
  author,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any;
  lessonId: number;
  dropletId: number;
  dropletName?: string;
  lessonName: string;
  userId?: number;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight, isWithNote?: boolean) => void;
  onDeleteHighlight: (id: number) => void;
  onNote: (notePos: number, text: string) => void;
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeBlock: number | undefined;
  setActiveBlock: (id: number) => void;
  author: boolean;
}) {
  switch (block.__component) {
    case "droplets.generic":
      return (
        <GenericBlockRenderer
          block={block}
          highlights={highlights}
          onHighlight={onHighlight}
          onDeleteHighlight={onDeleteHighlight}
          onNote={onNote}
          enrollmentId={enrollmentId}
          expanded={expanded}
          setExpanded={setExpanded}
          activeBlock={activeBlock}
          setActiveBlock={setActiveBlock}
          author={author}
        />
      );

    case "droplets.video":
      return (
        <div className="mx-auto md:-mx-8">
          <iframe
            width="100%"
            height="400"
            src={block.url}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded YouTube video"
            className="rounded-md"
          />
        </div>
      );

    case "droplets.quiz":
      return (
        <QuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.open-ended-quiz":
      return (
        <OpenEndedQuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.callout":
      return (
        <div
          className={`flex flex-col items-center space-y-4 rounded-md border px-6 py-6 dark:border-slate-500 ${block.color || "bg-sky-50 dark:bg-sky-800"}`}
        >
          {block?.iconEnabled && (
            <div className="">
              <CalloutIcon color={block.color || "bg-sky-300"}></CalloutIcon>
            </div>
          )}

          <div className="">
            <div className="prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit justify-left prose-li:marker:text-slate-700 mx-auto text-black">
              <BlocksRenderer content={block.content} />
            </div>
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full rounded-md border border-slate-200 p-4 dark:border-slate-500">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="h-4 w-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 border-t border-t-slate-200 pt-3 dark:border-slate-500">
            <div
              className="prose prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: block.content }}
            ></div>
          </CollapsibleContent>
        </Collapsible>
      );

    case "droplets.code-block":
      return (
        <CodeBlockViewer
          language={block.language}
          code={block.code}
          editable={block.editable}
          runnable={block.runnable}
        />
      );

    default:
      return null;
  }
}
