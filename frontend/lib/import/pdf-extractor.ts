import { v4 as uuidv4 } from "uuid";
import type { ImportResult, ImportSection } from "./types";
import { MAX_FILE_SIZE } from "./constants";

interface TextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
  width: number;
  height: number;
  fontName?: string;
}

interface PageTextData {
  items: TextItem[];
  pageNumber: number;
}

/**
 * Extract text from a PDF file using pdfjs-dist.
 * Returns an ImportResult with sections split by headings (or by page as fallback).
 */
export async function extractTextFromPDF(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`,
    );
  }

  // Dynamically import pdfjs-dist to avoid bundling it in the main chunk
  const pdfjsLib = await import("pdfjs-dist");

  // Configure the worker. In a browser environment, point to the worker file.
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let pdfDoc: Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("password")) {
      throw new Error(
        "This PDF is password-protected. Please remove the password and try again.",
      );
    }
    throw new Error(`Failed to load PDF: ${message}`);
  }

  const numPages = pdfDoc.numPages;
  if (numPages === 0) {
    throw new Error("The PDF has no pages.");
  }

  const warnings: string[] = [];

  const pageDataList: PageTextData[] = await Promise.all(
    Array.from({ length: numPages }, (_, i) => i + 1).map(async (pageNum) => {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = (textContent.items as TextItem[])
        .filter((item) => "str" in item && typeof item.str === "string")
        .filter((item) => item.str.trim().length > 0);

      if (items.length === 0) {
        warnings.push(
          `Page ${pageNum} had no extractable text (may be an image)`,
        );
      }

      return { items, pageNumber: pageNum };
    }),
  );

  const hasAnyText = pageDataList.some((p) => p.items.length > 0);
  if (!hasAnyText) {
    throw new Error(
      "No extractable text found in this PDF. It may be a scanned document with only images.",
    );
  }

  const sections = buildSections(pageDataList, warnings);

  return {
    sections,
    fileName: file.name,
    fileType: "pdf",
    warnings,
  };
}

/**
 * Build sections from page data. Tries heading-based splitting first,
 * falls back to page-by-page splitting.
 */
function buildSections(
  pageDataList: PageTextData[],
  warnings: string[],
): ImportSection[] {
  // Attempt heading-based splitting across all pages
  const headingBasedSections = buildHeadingBasedSections(pageDataList);
  if (headingBasedSections.length > 1) {
    return headingBasedSections;
  }

  // Fallback: each page is a section
  return buildPageBasedSections(pageDataList, warnings);
}

/**
 * Detect headings by font size heuristic and build sections split at headings.
 */
function buildHeadingBasedSections(
  pageDataList: PageTextData[],
): ImportSection[] {
  // Collect all font sizes to compute median
  const allFontSizes: number[] = [];
  for (const page of pageDataList) {
    for (const item of page.items) {
      const fontSize = Math.abs(item.transform[3]); // scaleY is approximate font size
      if (fontSize > 0) {
        allFontSizes.push(fontSize);
      }
    }
  }

  if (allFontSizes.length === 0) return [];

  const medianFontSize = computeMedian(allFontSizes);
  const headingThreshold = medianFontSize * 1.4; // 40% larger than median = heading

  interface LineWithMeta {
    text: string;
    fontSize: number;
    pageNumber: number;
    isHeading: boolean;
  }

  const allLines: LineWithMeta[] = [];

  for (const page of pageDataList) {
    if (page.items.length === 0) continue;

    // Group items into lines by y-position proximity
    const lines = groupItemsIntoLines(page.items);

    for (const line of lines) {
      const maxFontSize = Math.max(
        ...line.map((item) => Math.abs(item.transform[3])),
      );
      const text = line
        .map((item) => item.str)
        .join(" ")
        .trim();
      if (!text) continue;

      const isHeading = maxFontSize >= headingThreshold;
      allLines.push({
        text,
        fontSize: maxFontSize,
        pageNumber: page.pageNumber,
        isHeading,
      });
    }
  }

  // Build sections: each heading starts a new section
  const sections: ImportSection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  let currentStartPage = 1;
  let currentEndPage = 1;

  for (const line of allLines) {
    if (line.isHeading) {
      // Save previous section if it has content
      if (currentLines.length > 0 || currentTitle) {
        sections.push(
          createSection(
            currentTitle || "Untitled",
            currentLines,
            currentStartPage,
            currentEndPage,
          ),
        );
      }
      currentTitle = line.text;
      currentLines = [];
      currentStartPage = line.pageNumber;
      currentEndPage = line.pageNumber;
    } else {
      currentLines.push(line.text);
      currentEndPage = line.pageNumber;
    }
  }

  // Push the last section
  if (currentTitle || currentLines.length > 0) {
    sections.push(
      createSection(
        currentTitle || "Untitled",
        currentLines,
        currentStartPage,
        currentEndPage,
      ),
    );
  }

  return sections;
}

/**
 * Build one section per page.
 */
function buildPageBasedSections(
  pageDataList: PageTextData[],
  warnings: string[],
): ImportSection[] {
  const sections: ImportSection[] = [];

  for (const page of pageDataList) {
    if (page.items.length === 0) continue;

    const lines = groupItemsIntoLines(page.items);
    const textLines = lines
      .map((line) =>
        line
          .map((item) => item.str)
          .join(" ")
          .trim(),
      )
      .filter(Boolean);

    if (textLines.length === 0) continue;

    // Use the first line as title if it looks like a heading, otherwise use "Page N"
    const firstLine = textLines[0];
    const title =
      firstLine.length <= 80 && !firstLine.endsWith(".")
        ? firstLine
        : `Page ${page.pageNumber}`;

    const contentLines = title === firstLine ? textLines.slice(1) : textLines;

    sections.push(
      createSection(title, contentLines, page.pageNumber, page.pageNumber),
    );
  }

  return sections;
}

/**
 * Group text items into lines based on their y-position.
 */
function groupItemsIntoLines(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by y position (descending in PDF coords, so we negate)
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].transform[5];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[3]) || 12;
    const yTolerance = fontSize * 0.5;

    if (Math.abs(y - currentY) <= yTolerance) {
      currentLine.push(item);
    } else {
      // Sort current line by x position
      currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
      lines.push(currentLine);
      currentLine = [item];
      currentY = y;
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Convert body text lines into markdown format.
 */
function linesToMarkdown(lines: string[]): string {
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Already has list marker
      if (/^[-*•]\s/.test(trimmed)) {
        return `- ${trimmed.replace(/^[-*•]\s+/, "")}`;
      }

      // Numbered list
      if (/^\d+[.)]\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)/)?.[1] || "1";
        const text = trimmed.replace(/^\d+[.)]\s+/, "");
        return `${num}. ${text}`;
      }

      return trimmed;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Create an ImportSection from extracted data.
 */
function createSection(
  title: string,
  bodyLines: string[],
  startPage: number,
  endPage: number,
): ImportSection {
  const markdownContent = linesToMarkdown(bodyLines);
  const sourceInfo =
    startPage === endPage
      ? `Page ${startPage}`
      : `Pages ${startPage}-${endPage}`;

  return {
    id: uuidv4(),
    title: title.trim(),
    markdownContent,
    sourceInfo,
  };
}

/**
 * Compute the median of an array of numbers.
 */
function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
