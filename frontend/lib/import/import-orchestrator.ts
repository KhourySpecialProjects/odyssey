import type { CustomBlockNoteBlock } from "@/types";
import type { ImportResult, ImportSection } from "./types";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";
import { MAX_FILE_SIZE, ALLOWED_EXTENSIONS } from "./constants";

/**
 * Validate the file and route to the appropriate extractor.
 * Uses dynamic imports to keep pdfjs-dist out of the main bundle.
 */
export async function extractFromFile(file: File): Promise<ImportResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`,
    );
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  const extension = getFileExtension(fileName);

  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
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
      return await extractTextFromPDF(file);
    } else {
      // .pptx
      const { extractTextFromPPTX } = await import("./pptx-extractor");
      return await extractTextFromPPTX(file);
    }
  } catch (err) {
    // Re-throw errors that are already user-friendly
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      `Failed to extract content from "${file.name}". The file may be corrupted or in an unsupported format.`,
    );
  }
}

/**
 * Convert ImportSections to lesson-ready data by running each section's
 * markdownContent through parseMarkdownToBlockNote().
 */
export function sectionsToLessons(
  sections: ImportSection[],
): Array<{ title: string; blocks: CustomBlockNoteBlock[] }> {
  return sections.map((section) => {
    // Build markdown string: prepend the title as H1 so parseMarkdownToBlockNote
    // picks it up, then include body content
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
