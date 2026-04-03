import type { CustomBlockNoteBlock } from "@/types";
import type { ImportImage, ImportSection } from "./types";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";
import { ALLOWED_EXTENSIONS } from "./constants";

/**
 * Extract raw text and images from a file client-side.
 * File size is validated by the modal (UX) and extractors (defense-in-depth).
 */
export async function extractRawText(file: File): Promise<{
  text: string;
  fileType: "pdf" | "pptx";
  warnings: string[];
  images: Map<string, ImportImage>;
}> {
  const fileName = file.name.toLowerCase();
  const extension = getFileExtension(fileName);

  if (
    !ALLOWED_EXTENSIONS.includes(
      extension as (typeof ALLOWED_EXTENSIONS)[number],
    )
  ) {
    throw new Error(
      `Unsupported file type "${extension}". Please upload a PDF (.pdf) or PowerPoint (.pptx) file.`,
    );
  }

  if (file.size === 0) {
    throw new Error("The file is empty. Please select a valid file.");
  }

  try {
    if (extension === ".pdf") {
      const { extractTextFromPDF } = await import("./pdf-extractor");
      const result = await extractTextFromPDF(file);
      return {
        text: result.text,
        fileType: "pdf",
        warnings: result.warnings,
        images: result.images,
      };
    } else {
      const { extractTextFromPPTX } = await import("./pptx-extractor");
      const result = await extractTextFromPPTX(file);
      return {
        text: result.text,
        fileType: "pptx",
        warnings: result.warnings,
        images: result.images,
      };
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      `Failed to extract content from "${file.name}". The file may be corrupted or in an unsupported format.`,
    );
  }
}

/**
 * Clean extraction artifacts from section content.
 */
export function cleanSections(sections: ImportSection[]): ImportSection[] {
  return sections.map((s) => ({
    ...s,
    markdownContent: cleanMarkdown(s.markdownContent),
  }));
}

function cleanMarkdown(text: string): string {
  return (
    text
      // Remove page/slide markers
      .replace(/^--- (Page|Slide) \d+ ---\n?/gm, "")
      // Remove bold wrapping inside headings: "## **Text**" → "## Text"
      .replace(/^(#{1,3}\s+)\*\*(.+?)\*\*\s*$/gm, "$1$2")
      // Clean up double-bold artifacts
      .replace(/\*{4,}/g, "**")
      .trim()
  );
}

/**
 * Convert ImportSections to lesson-ready data by running each section's
 * markdownContent through parseMarkdownToBlockNote().
 */
export function sectionsToLessons(
  sections: ImportSection[],
): Array<{ title: string; blocks: CustomBlockNoteBlock[] }> {
  return sections.map((section) => {
    const markdownWithTitle = section.markdownContent.trim()
      ? `# ${section.title}\n\n${section.markdownContent}`
      : `# ${section.title}`;

    const { blocks } = parseMarkdownToBlockNote(markdownWithTitle);

    return {
      title: section.title,
      blocks,
    };
  });
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot);
}
