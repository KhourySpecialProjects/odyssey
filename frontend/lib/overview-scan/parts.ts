import type {
  ScanBlock,
  ScanDocument,
  ScanPart,
} from "@/lib/overview-scan/types";

// Part helpers for the structure rules (the prototype's).

const TEXT_TYPES: readonly ScanBlock["type"][] = [
  "heading",
  "paragraph",
  "list",
  "callout",
];

export const lessonParts = (doc: ScanDocument): ScanPart[] =>
  doc.parts.filter((p) => p.kind === "lesson");

export const dropletPart = (doc: ScanDocument): ScanPart => doc.parts[0];

export const textBlocks = (part: ScanPart): ScanBlock[] =>
  part.blocks.filter((b) => TEXT_TYPES.includes(b.type));

/** A block's text; list items are joined with ". ". */
export const blockText = (b: ScanBlock): string =>
  b.type === "list"
    ? b.items.join(". ")
    : b.type === "heading" || b.type === "paragraph" || b.type === "callout"
      ? b.text
      : "";
