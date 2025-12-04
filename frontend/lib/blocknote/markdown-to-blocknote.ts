import { BlockNoteBlock } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ParseResult {
  title: string;
  blocks: BlockNoteBlock[];
}

/**
 * Parse markdown content and convert to BlockNote JSON format
 */
export function parseMarkdownToBlockNote(markdown: string): ParseResult {
  const lines = markdown.split("\n");
  const blocks: BlockNoteBlock[] = [];
  let title = "Untitled Lesson";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      i++;
      continue;
    }

    // H1 - Title (first one becomes lesson name)
    if (trimmedLine.startsWith("# ")) {
      const text = trimmedLine.substring(2).trim();
      if (blocks.length === 0) {
        title = text; // First H1 becomes the lesson title
      }
      blocks.push(createHeading(text, 1));
      i++;
      continue;
    }

    // H2
    if (trimmedLine.startsWith("## ")) {
      const text = trimmedLine.substring(3).trim();
      blocks.push(createHeading(text, 2));
      i++;
      continue;
    }

    // H3
    if (trimmedLine.startsWith("### ")) {
      const text = trimmedLine.substring(4).trim();
      blocks.push(createHeading(text, 3));
      i++;
      continue;
    }

    // Custom Callout Blocks (single %)
    if (trimmedLine.startsWith("%") && !trimmedLine.startsWith("%%")) {
      const result = parseCallout(trimmedLine);
      if (result) {
        blocks.push(result);
      }
      i++;
      continue;
    }

    // Quiz Blocks (double %%)
    if (trimmedLine.startsWith("%%")) {
      const result = parseQuiz(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.nextIndex;
        continue;
      }
    }

    // LaTeX Block ($$...$$)
    if (trimmedLine.startsWith("$$")) {
      const result = parseLatexBlock(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.nextIndex;
        continue;
      }
    }

    // Table
    if (trimmedLine.includes("|")) {
      const result = parseTable(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.nextIndex;
        continue;
      }
    }

    // Numbered List
    if (/^\d+\.\s/.test(trimmedLine)) {
      const result = parseList(lines, i, "numbered");
      blocks.push(...result.blocks);
      i = result.nextIndex;
      continue;
    }

    // Bulleted List
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      const result = parseList(lines, i, "bullet");
      blocks.push(...result.blocks);
      i = result.nextIndex;
      continue;
    }

    // Regular paragraph (may contain inline LaTeX)
    const paragraph = parseParagraph(trimmedLine);
    blocks.push(paragraph);
    i++;
  }

  return { title, blocks };
}

/**
 * Create a heading block
 */
function createHeading(text: string, level: 1 | 2 | 3): BlockNoteBlock {
  return {
    id: uuidv4(),
    type: "heading",
    props: {
      level,
      textColor: "default",
      isToggleable: false,
      textAlignment: "left",
      backgroundColor: "default",
    },
    content: [
      {
        text,
        type: "text",
        styles: {},
      },
    ],
    children: [],
  };
}

/**
 * Parse callout blocks (%warning, %question, etc.)
 */
function parseCallout(line: string): BlockNoteBlock | null {
  const match = line.match(/^%(\S+)\s+(.+)$/);
  if (!match) return null;

  const [, calloutType, content] = match;

  // Map to valid callout types
  const validTypes = [
    "warning",
    "question",
    "important",
    "definition",
    "more-information",
    "caution",
    "default",
  ];

  if (!validTypes.includes(calloutType)) {
    return null;
  }

  return {
    id: uuidv4(),
    type: "callout",
    props: {
      calloutType,
    },
    content: [
      {
        text: content,
        type: "text",
        styles: {},
      },
    ],
    children: [],
  };
}

/**
 * Parse quiz blocks (%%true-false, %%open-ended, %%multiple-choice)
 */
function parseQuiz(
  lines: string[],
  startIndex: number,
): { block: BlockNoteBlock; nextIndex: number } | null {
  const firstLine = lines[startIndex].trim();
  const quizTypeMatch = firstLine.match(/^%%(.+)$/);
  if (!quizTypeMatch) return null;

  const quizType = quizTypeMatch[1].trim();
  let i = startIndex + 1;
  const listItems: string[] = [];

  // Collect all list items
  while (i < lines.length && lines[i].trim().startsWith("-")) {
    const item = lines[i].trim().substring(2).trim();
    listItems.push(item);
    i++;
  }

  if (listItems.length === 0) return null;

  // Parse based on quiz type
  if (quizType === "true-false") {
    return {
      block: createTrueFalseQuiz(listItems),
      nextIndex: i,
    };
  } else if (quizType === "open-ended") {
    return {
      block: createOpenEndedQuiz(listItems),
      nextIndex: i,
    };
  } else if (quizType === "multiple-choice") {
    return {
      block: createMultipleChoiceQuiz(listItems),
      nextIndex: i,
    };
  }

  return null;
}

/**
 * Create true/false quiz block
 */
function createTrueFalseQuiz(items: string[]): BlockNoteBlock {
  const question = items[0] || "";
  const answer = items[1]?.toLowerCase() === "true";

  return {
    id: uuidv4(),
    type: "quiz-true-false",
    props: {
      question,
      textColor: "default",
      correctAnswer: answer,
      textAlignment: "left",
      backgroundColor: "default",
    },
    children: [],
  };
}

/**
 * Create open-ended quiz block
 */
function createOpenEndedQuiz(items: string[]): BlockNoteBlock {
  const question = items[0] || "";
  const correctAnswer = items[1] || "";

  return {
    id: uuidv4(),
    type: "quiz-open-ended",
    props: {
      question,
      textColor: "default",
      correctAnswer,
      textAlignment: "left",
      backgroundColor: "default",
    },
    children: [],
  };
}

/**
 * Create multiple choice quiz block
 */
function createMultipleChoiceQuiz(items: string[]): BlockNoteBlock {
  const question = items[0] || "";
  const options = items.slice(1).map((item, index) => {
    const isCorrect = item.endsWith("<");
    const text = isCorrect ? item.slice(0, -1).trim() : item.trim();

    return {
      id: (index + 1).toString(),
      text,
      isCorrect,
    };
  });

  return {
    id: uuidv4(),
    type: "quiz-multiple-choice",
    props: {
      options,
      question,
      textColor: "default",
      textAlignment: "left",
      backgroundColor: "default",
    },
    children: [],
  };
}

/**
 * Parse LaTeX block ($$...$$)
 */
function parseLatexBlock(
  lines: string[],
  startIndex: number,
): { block: BlockNoteBlock; nextIndex: number } | null {
  const firstLine = lines[startIndex].trim();
  if (!firstLine.startsWith("$$")) return null;

  let content = "";
  let i = startIndex;

  // Single line block
  if (firstLine.endsWith("$$") && firstLine.length > 4) {
    content = firstLine.substring(2, firstLine.length - 2).trim();
    return {
      block: createLatexBlock(content, true),
      nextIndex: i + 1,
    };
  }

  // Multi-line block
  i++;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.endsWith("$$")) {
      content += line.substring(0, line.length - 2).trim();
      return {
        block: createLatexBlock(content, true),
        nextIndex: i + 1,
      };
    }
    content += line + " ";
    i++;
  }

  return null;
}

/**
 * Create LaTeX block
 */
function createLatexBlock(
  content: string,
  displayMode: boolean,
): BlockNoteBlock {
  return {
    id: uuidv4(),
    type: "latex",
    props: {
      content,
      displayMode,
    },
    children: [],
  };
}

/**
 * Parse table
 */
function parseTable(
  lines: string[],
  startIndex: number,
): { block: BlockNoteBlock; nextIndex: number } | null {
  let i = startIndex;
  const tableLines: string[] = [];

  // Collect all table lines
  while (i < lines.length && lines[i].trim().includes("|")) {
    tableLines.push(lines[i].trim());
    i++;
  }

  if (tableLines.length < 2) return null;

  // Skip separator line (second line with dashes)
  const headerLine = tableLines[0];
  const dataLines = tableLines.slice(2);

  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h);
  const rows: string[][] = [headers];

  dataLines.forEach((line) => {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c);
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  return {
    block: createTable(rows),
    nextIndex: i,
  };
}

/**
 * Create table block
 */
function createTable(rows: string[][]): BlockNoteBlock {
  const tableRows = rows.map((row) => ({
    cells: row.map((cellText) => ({
      type: "tableCell",
      props: {
        colspan: 1,
        rowspan: 1,
        textColor: "default",
        textAlignment: "left",
        backgroundColor: "default",
      },
      content: [
        {
          text: cellText,
          type: "text",
          styles: {},
        },
      ],
    })),
  }));

  return {
    id: uuidv4(),
    type: "table",
    props: {
      textColor: "default",
    },
    content: {
      rows: tableRows,
      type: "tableContent",
      columnWidths: rows[0].map(() => null),
    } as any,
    children: [],
  };
}

/**
 * Parse lists (numbered or bulleted)
 */
function parseList(
  lines: string[],
  startIndex: number,
  listType: "numbered" | "bullet",
): { blocks: BlockNoteBlock[]; nextIndex: number } {
  const blocks: BlockNoteBlock[] = [];
  let i = startIndex;

  const isListItem = (line: string) => {
    if (listType === "numbered") {
      return /^\d+\.\s/.test(line.trim());
    }
    return line.trim().startsWith("- ") || line.trim().startsWith("* ");
  };

  while (i < lines.length && isListItem(lines[i])) {
    const line = lines[i].trim();
    let text = "";

    if (listType === "numbered") {
      text = line.replace(/^\d+\.\s/, "").trim();
    } else {
      text = line.substring(2).trim();
    }

    blocks.push({
      id: uuidv4(),
      type: listType === "numbered" ? "numberedListItem" : "bulletListItem",
      props: {
        textColor: "default",
        textAlignment: "left",
        backgroundColor: "default",
      },
      content: [
        {
          text,
          type: "text",
          styles: {},
        },
      ],
      children: [],
    });

    i++;
  }

  return { blocks, nextIndex: i };
}

/**
 * Parse paragraph (handles inline LaTeX with $...$)
 */
function parseParagraph(text: string): BlockNoteBlock {
  // For now, we'll treat inline LaTeX as regular text
  // BlockNote will need to handle inline LaTeX separately if needed
  return {
    id: uuidv4(),
    type: "paragraph",
    props: {
      textColor: "default",
      textAlignment: "left",
      backgroundColor: "default",
    },
    content: [
      {
        text,
        type: "text",
        styles: {},
      },
    ],
    children: [],
  };
}
