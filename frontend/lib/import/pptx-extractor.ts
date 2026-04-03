import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE } from "./constants";
import type { ImportImage } from "./types";

/**
 * Extract formatted markdown from a PPTX file using JSZip + DOMParser.
 * Extracts images, links, and adds slide break separators (---).
 */
export async function extractTextFromPPTX(file: File): Promise<{
  text: string;
  warnings: string[];
  images: Map<string, ImportImage>;
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`,
    );
  }

  const JSZip = (await import("jszip")).default;

  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error(
      "Failed to read the PPTX file. It may be corrupted or not a valid PPTX format.",
    );
  }

  const slideFiles = Object.keys(zip.files)
    .filter(
      (name) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(name) && !zip.files[name].dir,
    )
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error(
      "No slides found in this PPTX file. It may be empty or corrupted.",
    );
  }

  const warnings: string[] = [];
  const images = new Map<string, ImportImage>();

  const slideTexts = await Promise.all(
    slideFiles.map(async (slideFile, i) => {
      const slideNumber = i + 1;
      const xmlString = await zip.files[slideFile].async("string");

      // Parse relationship file for this slide (images + links)
      const relsPath = slideFile.replace(
        /slides\/(slide\d+\.xml)/,
        "slides/_rels/$1.rels",
      );
      const rels = await parseRelationships(zip, relsPath);

      // Extract text with links
      const text = parseSlideMarkdown(xmlString, rels);

      // Extract images from this slide
      const slideImages = await extractSlideImages(
        xmlString,
        rels,
        zip,
        slideNumber,
        warnings,
      );
      for (const [id, img] of slideImages) {
        images.set(id, img);
      }

      // Build image markers
      const imageMarkers = Array.from(slideImages.keys())
        .map((id) => `![image](IMPORT_IMG_${id})`)
        .join("\n");

      if (!text.trim() && slideImages.size === 0) {
        warnings.push(`Slide ${slideNumber} had no extractable text`);
        return "";
      }

      const parts = [`--- Slide ${slideNumber} ---`, text, imageMarkers].filter(
        Boolean,
      );

      return parts.join("\n");
    }),
  );

  // Join slides with separator (---) between them for slide breaks
  const fullText = slideTexts.filter(Boolean).join("\n\n---\n\n");

  if (!fullText.trim()) {
    throw new Error(
      "No text content could be extracted from the presentation. All slides may contain only images.",
    );
  }

  return { text: fullText, warnings, images };
}

interface RelationshipMap {
  images: Map<string, string>; // rId -> media file path
  links: Map<string, string>; // rId -> URL
}

async function parseRelationships(
  zip: InstanceType<typeof import("jszip")>,
  relsPath: string,
): Promise<RelationshipMap> {
  const result: RelationshipMap = { images: new Map(), links: new Map() };

  const relsFile = zip.files[relsPath];
  if (!relsFile) return result;

  const xmlString = await relsFile.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  const relationships = Array.from(doc.getElementsByTagName("Relationship"));

  for (const rel of relationships) {
    const id = rel.getAttribute("Id") ?? "";
    const target = rel.getAttribute("Target") ?? "";
    const type = rel.getAttribute("Type") ?? "";

    if (type.includes("/image")) {
      // Resolve relative path: ../media/image1.png -> ppt/media/image1.png
      const mediaPath = target.startsWith("../")
        ? `ppt/${target.slice(3)}`
        : target;
      result.images.set(id, mediaPath);
    } else if (type.includes("/hyperlink")) {
      result.links.set(id, target);
    }
  }

  return result;
}

async function extractSlideImages(
  xmlString: string,
  rels: RelationshipMap,
  zip: InstanceType<typeof import("jszip")>,
  slideNumber: number,
  warnings: string[],
): Promise<Map<string, ImportImage>> {
  const images = new Map<string, ImportImage>();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Find all <a:blip> elements (image references)
  const blips = Array.from(doc.getElementsByTagName("a:blip"));

  for (const blip of blips) {
    const rEmbed = blip.getAttribute("r:embed");
    if (!rEmbed) continue;

    const mediaPath = rels.images.get(rEmbed);
    if (!mediaPath) continue;

    // Skip unsupported formats
    const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "emf" || ext === "wmf") {
      warnings.push(
        `Slide ${slideNumber}: Skipped ${ext.toUpperCase()} image (unsupported format)`,
      );
      continue;
    }

    const zipEntry = zip.files[mediaPath];
    if (!zipEntry) continue;

    try {
      const blob = await zipEntry.async("blob");
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "svg"
            ? "image/svg+xml"
            : "image/jpeg";

      const id = uuidv4();
      images.set(id, {
        id,
        blob,
        fileName: mediaPath.split("/").pop() ?? `image_${slideNumber}.${ext}`,
        mimeType,
      });
    } catch {
      warnings.push(
        `Slide ${slideNumber}: Failed to extract image ${mediaPath}`,
      );
    }
  }

  return images;
}

function parseSlideMarkdown(xmlString: string, rels: RelationshipMap): string {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, "application/xml");
  } catch (err) {
    console.warn("Failed to parse slide XML:", err);
    return "";
  }

  const shapes = Array.from(doc.getElementsByTagName("p:sp"));
  const lines: string[] = [];

  for (const shape of shapes) {
    const phElements = shape.getElementsByTagName("p:ph");
    const ph = phElements[0];
    const phType = ph?.getAttribute("type") ?? "";

    const isTitleShape = phType === "title" || phType === "ctrTitle";
    const isSubtitle = phType === "subTitle";

    const txBodyElements = shape.getElementsByTagName("p:txBody");
    if (txBodyElements.length === 0) continue;

    const txBody = txBodyElements[0];
    const paragraphs = Array.from(txBody.getElementsByTagName("a:p"));

    for (const para of paragraphs) {
      const paraText = extractParagraphMarkdown(para, rels);
      if (!paraText.trim()) continue;

      if (isTitleShape) {
        lines.push(`# ${paraText.trim()}`);
      } else if (isSubtitle) {
        lines.push(`## ${paraText.trim()}`);
      } else {
        const bulletLevel = getBulletLevel(para);
        const indent = "  ".repeat(bulletLevel);
        lines.push(`${indent}- ${paraText.trim()}`);
      }
    }
  }

  return lines.join("\n");
}

function extractParagraphMarkdown(
  para: Element,
  rels: RelationshipMap,
): string {
  const runs = Array.from(para.getElementsByTagName("a:r"));
  if (runs.length > 0) {
    return runs
      .map((run) => {
        const textEls = run.getElementsByTagName("a:t");
        const text = textEls[0]?.textContent ?? "";
        if (!text) return "";

        const rPr = run.getElementsByTagName("a:rPr")[0];
        const isBold = rPr?.getAttribute("b") === "1";
        const isItalic = rPr?.getAttribute("i") === "1";
        const isUnderline = rPr?.getAttribute("u") === "sng";
        const isStrike = rPr?.getAttribute("strike") === "sngStrike";

        // Check for hyperlink
        const hlinkClick = rPr
          ? Array.from(rPr.getElementsByTagName("a:hlinkClick"))[0]
          : null;
        const linkRId = hlinkClick?.getAttribute("r:id");
        const linkUrl = linkRId ? rels.links.get(linkRId) : null;

        let formatted = text;
        if (isBold && isItalic) formatted = `***${formatted}***`;
        else if (isBold) formatted = `**${formatted}**`;
        else if (isItalic) formatted = `*${formatted}*`;
        if (isStrike) formatted = `~~${formatted}~~`;
        if (isUnderline) formatted = `<u>${formatted}</u>`;
        if (linkUrl) formatted = `[${formatted}](${linkUrl})`;

        return formatted;
      })
      .join("");
  }

  const textEls = Array.from(para.getElementsByTagName("a:t"));
  return textEls.map((el) => el.textContent ?? "").join("");
}

function getBulletLevel(para: Element): number {
  const pPrElements = para.getElementsByTagName("a:pPr");
  const pPr = pPrElements[0];
  if (!pPr) return 0;
  const lvl = parseInt(pPr.getAttribute("lvl") ?? "0", 10);
  return isNaN(lvl) ? 0 : Math.max(0, lvl);
}
