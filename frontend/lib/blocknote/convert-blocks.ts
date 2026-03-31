/**
 * Shared utility for converting BlockNote v2 JSON blocks to Strapi v1 Block format.
 * Extracted from lesson-renderer.tsx so it can be reused by other features
 * (e.g., presentation mode) without duplicating 250+ lines of conversion logic.
 */
import katex from "katex";
import { Block, CustomBlockNoteBlock } from "@/types";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";

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
  let hash = 0;
  for (let i = 0; i < blockId.length; i++) {
    const char = blockId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTextWithStyles(
  text: string,
  styles?: BlockNoteTextStyles,
): string {
  if (!styles) return escapeHtml(text);

  if (styles.latex) {
    return `$${text}$`;
  }

  let styledText = escapeHtml(text);
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
      // LaTeX is kept as plain text – rendered later by block renderers
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

  const nestedListItems = children.filter(
    (child) => child.type === "numberedListItem",
  );

  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
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
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
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

  const children = item.children ?? [];

  const nestedListItems = children.filter(
    (child) => child.type === "bulletListItem",
  );

  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
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
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
      nestedListHtml = allChildrenContent;
    }
  }

  return `<li>${textContent}${nestedListHtml}</li>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertSingleBlock(blockAny: any, blockIndex: number): Block | null {
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

      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
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
      const url = (blockAny.props?.url as string) || "";
      const alt = (blockAny.props?.name as string) || "";
      const layout = (blockAny.props?.layout as string) || "default";
      const imgTag = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="rounded-md" />`;
      if (layout !== "default" && url) {
        const layoutKey = layout.toUpperCase().replace(/-/g, "_");
        // Prefix with layout comment for presentation mode.
        // Regular renderers (DOMPurify) strip the comment and show just the <img>.
        return {
          __component: "droplets.generic",
          id: blockId,
          content: `<!--LAYOUT:${layoutKey}:${url}-->${imgTag}`,
        };
      }
      return {
        __component: "droplets.generic",
        id: blockId,
        content: imgTag,
      };
    }

    case "latex": {
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

      const hasHeaders = blockAny.props?.headers !== false;
      const cellBackgroundColors: Record<string, string> = {};

      const markdownRows: string[] = [];

      tableContent.rows.forEach((row: BlockNoteTableRow, rowIndex: number) => {
        const cells = row.cells.map((cell, cellIndex: number) => {
          const cellContent = cell.content ?? [];
          const cellText = convertInlineContentToText(cellContent);

          if (cell.props?.backgroundColor) {
            const key = `${rowIndex}-${cellIndex}`;
            cellBackgroundColors[key] = cell.props.backgroundColor;
          }

          return cellText.replace(/\|/g, "\\|").trim();
        });

        markdownRows.push(`| ${cells.join(" | ")} |`);

        if (hasHeaders && rowIndex === 0) {
          const separator = cells.map(() => "---").join(" | ");
          markdownRows.push(`| ${separator} |`);
        }
      });

      const tableMarkdown = markdownRows.join("\n");

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
      const language = blockAny.props?.language || "javascript";
      const code = blockAny.props?.code || "";
      const editable = blockAny.props?.editable || false;
      const runnable = blockAny.props?.runnable || false;

      return {
        __component: "droplets.code-block",
        id: blockIndex,
        language,
        code,
        editable,
        runnable,
      };
    }

    case "notebook-code": {
      const language = blockAny.props?.language || "python";
      const code = blockAny.props?.code || "";
      const editable = blockAny.props?.editable === "true";
      const testCode = blockAny.props?.testCode || "";

      return {
        __component: "droplets.code-block" as const,
        id: blockIndex,
        language,
        code,
        editable,
        runnable: true,
        testCode,
        isNotebook: true,
      } as Block;
    }

    case "sandpack-block": {
      const template = blockAny.props?.template || "vanilla";
      const files = blockAny.props?.files || "{}";
      const showPreview = blockAny.props?.showPreview ?? true;
      const editable = blockAny.props?.editable ?? true;

      return {
        __component: "droplets.sandpack-block",
        id: blockIndex,
        template,
        files,
        showPreview,
        editable,
      };
    }

    case "slide-break": {
      return {
        __component: "droplets.generic",
        id: blockId,
        content: SLIDE_BREAK_MARKER,
      };
    }

    default:
      return null;
  }
}

/**
 * Converts BlockNote v2 JSON blocks to Strapi v1 Block format.
 * This is the canonical implementation — import from this module
 * rather than duplicating the logic.
 */
export function convertBlockNoteToV1Blocks(
  blocksV2: CustomBlockNoteBlock[],
): Block[] {
  if (!Array.isArray(blocksV2)) return [];

  const processedBlocks: Block[] = [];
  let i = 0;

  while (i < blocksV2.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blockAny = blocksV2[i] as any;

    if (blockAny.type === "paragraph") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inlineContent = (blockAny.content ?? []) as any[];
      const textContent = convertInlineContentToHtml(inlineContent);
      const isEmpty = !textContent || textContent.trim() === "";

      if (isEmpty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emptyParagraphBlocks: any[] = [];
        let j = i;

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

          if (nextIsEmpty) {
            break;
          }

          paragraphBlocks.push(nextBlock);
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

    if (blockAny.type === "quote") {
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

    if (blockAny.type === "numberedListItem") {
      const listItems: CustomBlockNoteBlock[] = [];
      const sourceBlockIds: number[] = [];
      let j = i;

      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j];
        if (nextBlock.type === "numberedListItem") {
          listItems.push(nextBlock);
          if (nextBlock.id) {
            sourceBlockIds.push(blockNoteIdToNumber(nextBlock.id));
          }
          j++;
        } else if (nextBlock.type === "quote") {
          j++;
        } else {
          break;
        }
      }

      const listItemHtml = listItems
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => convertNumberedListItem(item, 0))
        .join("");

      if (listItemHtml) {
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

      i = j;
      continue;
    }

    if (blockAny.type === "bulletListItem") {
      const listItems: CustomBlockNoteBlock[] = [];
      const sourceBlockIds: number[] = [];
      let j = i;

      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j];
        if (nextBlock.type === "bulletListItem") {
          listItems.push(nextBlock);
          if (nextBlock.id) {
            sourceBlockIds.push(blockNoteIdToNumber(nextBlock.id));
          }
          j++;
        } else if (nextBlock.type === "quote") {
          j++;
        } else {
          break;
        }
      }

      const listItemHtml = listItems
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => convertBulletListItem(item, 0))
        .join("");

      if (listItemHtml) {
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

      i = j;
      continue;
    }

    const convertedBlock = convertSingleBlock(blockAny, i);
    if (convertedBlock !== null) {
      processedBlocks.push(convertedBlock);
    }
    i++;
  }

  return processedBlocks.filter((block): block is Block => block !== null);
}
