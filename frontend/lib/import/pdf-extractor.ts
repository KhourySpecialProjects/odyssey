import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE } from "./constants";
import type { ImportImage } from "./types";

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
}

/**
 * Extract formatted markdown from a PDF file using pdfjs-dist.
 * Maps font sizes to heading levels, detects bold, extracts images and links.
 */
export async function extractTextFromPDF(file: File): Promise<{
  text: string;
  warnings: string[];
  images: Map<string, ImportImage>;
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`,
    );
  }

  const pdfjsLib = await import("pdfjs-dist");

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
  const images = new Map<string, ImportImage>();

  // First pass: collect font sizes and page data
  const allFontSizes: number[] = [];
  const pageDataList = await Promise.all(
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

      for (const item of items) {
        const fs = Math.abs(item.transform[3]);
        if (fs > 0) allFontSizes.push(fs);
      }

      // Check for images via operator list
      let hasImages = false;
      try {
        const ops = await page.getOperatorList();
        const paintImageOps = [
          pdfjsLib.OPS?.paintImageXObject,
          (pdfjsLib.OPS as Record<string, number>)?.paintJpegXObject,
          pdfjsLib.OPS?.paintImageXObjectRepeat,
        ].filter(Boolean);
        hasImages = ops.fnArray.some((fn: number) =>
          paintImageOps.includes(fn),
        );
      } catch {
        // Operator list not available — skip image detection
      }

      // Extract link annotations
      let annotations: Array<{ url: string; rect: number[] }> = [];
      try {
        const annots = await page.getAnnotations();
        annotations = annots
          .filter(
            (a: { subtype: string; url?: string }) =>
              a.subtype === "Link" && a.url,
          )
          .map((a: { url: string; rect: number[] }) => ({
            url: a.url,
            rect: a.rect,
          }));
      } catch {
        // Annotations not available
      }

      return { items, pageNumber: pageNum, page, hasImages, annotations };
    }),
  );

  if (allFontSizes.length === 0 && !pageDataList.some((p) => p.hasImages)) {
    throw new Error(
      "No extractable text found in this PDF. It may be a scanned document with only images.",
    );
  }

  const medianSize = allFontSizes.length > 0 ? computeMedian(allFontSizes) : 12;
  const thresholds = {
    h1: medianSize * 1.8,
    h2: medianSize * 1.4,
    h3: medianSize * 1.2,
  };

  // Second pass: build formatted markdown per page
  const pageTexts: string[] = [];
  for (const {
    items,
    pageNumber,
    page,
    hasImages,
    annotations,
  } of pageDataList) {
    const parts: string[] = [];

    if (items.length > 0) {
      const lines = groupItemsIntoLines(items);
      const markdownLines = lines.map((line) => {
        const maxFontSize = Math.max(
          ...line.map((item) => Math.abs(item.transform[3])),
        );
        const text = line
          .map((item) => {
            const str = item.str.trim();
            if (!str) return "";
            const isHeading = maxFontSize > thresholds.h3;
            const isBold =
              item.fontName && /bold/i.test(item.fontName) && !isHeading;
            const isItalic =
              item.fontName &&
              /italic|oblique/i.test(item.fontName) &&
              !isHeading;
            if (isBold && isItalic) return `***${str}***`;
            if (isBold) return `**${str}**`;
            if (isItalic) return `*${str}*`;
            return str;
          })
          .filter(Boolean)
          .join(" ")
          .trim();

        if (!text) return "";

        // Apply link annotations to this line's text
        const linkedText = applyLinkAnnotations(text, line, annotations);

        if (maxFontSize >= thresholds.h1)
          return `# ${stripMarkdown(linkedText)}`;
        if (maxFontSize >= thresholds.h2)
          return `## ${stripMarkdown(linkedText)}`;
        if (maxFontSize >= thresholds.h3)
          return `### ${stripMarkdown(linkedText)}`;

        if (/^[-*•]\s/.test(linkedText)) {
          return `- ${linkedText.replace(/^[-*•]\s+/, "")}`;
        }
        if (/^\d+[.)]\s/.test(linkedText)) {
          return linkedText;
        }

        return linkedText;
      });

      parts.push(...markdownLines.filter(Boolean));
    }

    // Extract page image if it has embedded images
    if (hasImages && typeof document !== "undefined") {
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          } as Parameters<typeof page.render>[0]).promise;
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.85),
          );
          if (blob && blob.size > 1024) {
            // Skip tiny images (<1KB, likely artifacts)
            const id = uuidv4();
            images.set(id, {
              id,
              blob,
              fileName: `page_${pageNumber}.jpg`,
              mimeType: "image/jpeg",
            });
            parts.push(`![image](IMPORT_IMG_${id})`);
          }
        }
      } catch {
        warnings.push(`Page ${pageNumber}: Failed to render page image`);
      }
    }

    if (parts.length > 0) {
      pageTexts.push(`--- Page ${pageNumber} ---\n${parts.join("\n")}`);
    }
  }

  const fullText = pageTexts.join("\n\n");

  if (!fullText.trim()) {
    throw new Error(
      "No extractable text found in this PDF. It may be a scanned document with only images.",
    );
  }

  return { text: fullText, warnings, images };
}

/**
 * Match link annotations to text items by coordinate overlap.
 * Best-effort: wraps text in markdown link syntax when positions match.
 */
function applyLinkAnnotations(
  text: string,
  lineItems: TextItem[],
  annotations: Array<{ url: string; rect: number[] }>,
): string {
  if (annotations.length === 0) return text;

  // Check if any text item in this line overlaps a link annotation
  for (const item of lineItems) {
    const x = item.transform[4];
    const y = item.transform[5];

    for (const ann of annotations) {
      const [left, bottom, right, top] = ann.rect;
      const tolerance = 5;

      if (
        x >= left - tolerance &&
        x <= right + tolerance &&
        y >= bottom - tolerance &&
        y <= top + tolerance &&
        item.str.trim()
      ) {
        const raw = item.str.trim();
        // Escape regex special chars and use word boundary to avoid partial matches
        const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<!\\[)${escaped}(?!\\])`);
        if (regex.test(text)) {
          text = text.replace(regex, `[${raw}](${ann.url})`);
        }
      }
    }
  }

  return text;
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}

function groupItemsIntoLines(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];

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

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
