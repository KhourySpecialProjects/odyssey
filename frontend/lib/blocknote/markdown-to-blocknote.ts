/**
 * Converts markdown text to BlockNote JSON format
 * 
 * BlockNote uses a JSON structure where each block has:
 * - id: unique identifier
 * - type: block type (heading, paragraph, bulletListItem, etc.)
 * - props: block properties (level for headings, etc.)
 * - content: array of inline content with text and styling
 * - children: nested blocks for lists
 */

type BlockNoteContent = {
  type: string;
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
  };
}[];

type BlockNoteBlock = {
  id: string;
  type: string;
  props: Record<string, any>;
  content: BlockNoteContent;
  children?: BlockNoteBlock[];
};

/**
 * Generate a unique ID for BlockNote blocks
 */
function generateBlockId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Parse inline markdown formatting (bold, italic, code, etc.)
 * 
 * Example: "This is **bold** and *italic* text" becomes:
 * [
 *   { type: "text", text: "This is " },
 *   { type: "text", text: "bold", styles: { bold: true } },
 *   { type: "text", text: " and " },
 *   { type: "text", text: "italic", styles: { italic: true } },
 *   { type: "text", text: " text" }
 * ]
 */
function parseInlineFormatting(text: string): BlockNoteContent {
  const content: BlockNoteContent = [];
  
  // Regex patterns for different formatting
  const patterns = {
    bold: /\*\*(.+?)\*\*/g,
    italic: /\*(.+?)\*/g,
    code: /`(.+?)`/g,
    strikethrough: /~~(.+?)~~/g,
  };

  let lastIndex = 0;
  const matches: Array<{ index: number; length: number; text: string; style: string }> = [];

  // Find all formatting matches
  for (const [style, pattern] of Object.entries(patterns)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[1],
        style,
      });
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // If no formatting, return plain text
  if (matches.length === 0) {
    return text ? [{ type: "text", text }] : [];
  }

  // Build content array with formatted segments
  matches.forEach((match) => {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      if (plainText) {
        content.push({ type: "text", text: plainText });
      }
    }

    // Add formatted text
    content.push({
      type: "text",
      text: match.text,
      styles: { [match.style]: true },
    });

    lastIndex = match.index + match.length;
  });

  // Add remaining plain text
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex);
    if (remaining) {
      content.push({ type: "text", text: remaining });
    }
  }

  return content;
}

/**
 * Convert a single markdown line to a BlockNote block
 */
function convertLineToBlock(line: string): BlockNoteBlock | null {
  // Skip empty lines
  if (!line.trim()) {
    return null;
  }

  // Heading
  const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();
    return {
      id: generateBlockId(),
      type: "heading",
      props: {
        level: level as 1 | 2 | 3,
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
      },
      content: parseInlineFormatting(text),
      children: [],
    };
  }

  // Bullet list item
  if (line.match(/^[-*]\s+/)) {
    const text = line.replace(/^[-*]\s+/, "").trim();
    return {
      id: generateBlockId(),
      type: "bulletListItem",
      props: {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
      },
      content: parseInlineFormatting(text),
      children: [],
    };
  }

  // Numbered list item
  const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
  if (numberedMatch) {
    const text = numberedMatch[1].trim();
    return {
      id: generateBlockId(),
      type: "numberedListItem",
      props: {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
      },
      content: parseInlineFormatting(text),
      children: [],
    };
  }

  // Code block marker (will be handled specially)
  if (line.trim() === "```" || line.match(/^```\w+$/)) {
    return null; // Skip these, handled in main function
  }

  // Regular paragraph
  return {
    id: generateBlockId(),
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
    },
    content: parseInlineFormatting(line.trim()),
    children: [],
  };
}

/**
 * Main conversion function: Markdown string to BlockNote JSON
 * 
 * This processes the markdown line by line, handling:
 * - Headings (# ## ###)
 * - Paragraphs
 * - Lists (bullet and numbered)
 * - Code blocks
 * - Inline formatting (bold, italic, code, etc.)
 */
export function markdownToBlockNote(markdown: string): BlockNoteBlock[] {
  const lines = markdown.split("\n");
  const blocks: BlockNoteBlock[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = line.trim().substring(3) || "plaintext";
        codeBlockContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          id: generateBlockId(),
          type: "codeBlock",
          props: {
            language: codeBlockLanguage,
          },
          content: [
            {
              type: "text",
              text: codeBlockContent.join("\n"),
            },
          ],
          children: [],
        });
        codeBlockContent = [];
      }
      continue;
    }

    // Collect code block content
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Convert regular line to block
    const block = convertLineToBlock(line);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * Extract metadata from markdown
 * 
 * Looks for a "## Metadata" section and parses key-value pairs
 * Example:
 * ## Metadata
 * - **Description:** This is a description
 * - **Tags:** tag1, tag2, tag3
 */
export function extractMetadata(markdown: string): {
  description?: string;
  tags?: string[];
  focusArea?: string;
  type?: string;
} {
  const metadata: Record<string, any> = {};
  
  const metadataMatch = markdown.match(/## Metadata\s*\n([\s\S]*?)(?=\n##|\n#|$)/);
  
  if (metadataMatch) {
    const metadataSection = metadataMatch[1];
    const lines = metadataSection.split("\n");
    
    for (const line of lines) {
      // Match "- **Key:** Value" or "- Key: Value"
      const match = line.match(/^[-*]\s+\*?\*?([^:*]+)\*?\*?:\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase();
        const value = match[2].trim();
        
        if (key === "tags") {
          metadata.tags = value.split(",").map(t => t.trim());
        } else if (key === "description") {
          metadata.description = value;
        } else if (key === "focus area" || key === "focusarea") {
          metadata.focusArea = value;
        } else if (key === "type") {
          metadata.type = value;
        }
      }
    }
  }
  
  return metadata;
}