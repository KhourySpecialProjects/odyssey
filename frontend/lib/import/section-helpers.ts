import { v4 as uuidv4 } from "uuid";
import type { ImportSection } from "./types";

/**
 * Merge two adjacent sections into one combined section.
 * idA must come before idB in the array. If they are not adjacent or not found,
 * the original array is returned unchanged.
 */
export function mergeSections(
  sections: ImportSection[],
  idA: string,
  idB: string,
): ImportSection[] {
  const indexA = sections.findIndex((s) => s.id === idA);
  const indexB = sections.findIndex((s) => s.id === idB);

  if (indexA === -1 || indexB === -1) return sections;

  // Ensure A comes before B
  const firstIndex = Math.min(indexA, indexB);
  const secondIndex = Math.max(indexA, indexB);

  // They must be adjacent
  if (secondIndex - firstIndex !== 1) return sections;

  const first = sections[firstIndex];
  const second = sections[secondIndex];

  const merged: ImportSection = {
    id: uuidv4(),
    title: first.title,
    markdownContent: [first.markdownContent, second.markdownContent]
      .filter(Boolean)
      .join("\n\n"),
    sourceInfo: mergeSourceInfo(first.sourceInfo, second.sourceInfo),
  };

  const result = [...sections];
  result.splice(firstIndex, 2, merged);
  return result;
}

/**
 * Delete a section by id. Prevents deletion if it is the only remaining section.
 */
export function deleteSection(
  sections: ImportSection[],
  id: string,
): ImportSection[] {
  if (sections.length <= 1) return sections;

  const index = sections.findIndex((s) => s.id === id);
  if (index === -1) return sections;

  const result = [...sections];
  result.splice(index, 1);
  return result;
}

/**
 * Update the title of a section by id.
 */
export function updateSectionTitle(
  sections: ImportSection[],
  id: string,
  newTitle: string,
): ImportSection[] {
  const index = sections.findIndex((s) => s.id === id);
  if (index === -1) return sections;

  const result = [...sections];
  result[index] = { ...result[index], title: newTitle };
  return result;
}

/**
 * Update the markdown content of a section by id.
 */
export function updateSectionContent(
  sections: ImportSection[],
  id: string,
  newContent: string,
): ImportSection[] {
  const index = sections.findIndex((s) => s.id === id);
  if (index === -1) return sections;

  const result = [...sections];
  result[index] = { ...result[index], markdownContent: newContent };
  return result;
}

/**
 * Fix trailing headings: if a lesson ends with a heading that has no body text
 * after it, move that heading (and any consecutive trailing headings) to the
 * start of the next lesson. This prevents lessons that end abruptly on a heading
 * with no supporting content.
 */
export function fixTrailingHeadings(
  sections: ImportSection[],
): ImportSection[] {
  if (sections.length <= 1) return sections;

  const result = sections.map((s) => ({ ...s }));

  // Walk backwards from second-to-last to first
  for (let i = 0; i < result.length - 1; i++) {
    const lines = result[i].markdownContent.split("\n");

    // Find where trailing headings start (walk from the end)
    let splitAt = lines.length;
    for (let j = lines.length - 1; j >= 0; j--) {
      const trimmed = lines[j].trim();
      if (!trimmed) continue; // skip blank lines
      if (
        /^#{1,3}\s/.test(trimmed) ||
        /^--- (Page|Slide) \d+ ---$/.test(trimmed)
      ) {
        splitAt = j;
      } else {
        break; // found non-heading, non-blank content — stop
      }
    }

    // If we found trailing headings (splitAt < lines.length)
    if (splitAt < lines.length && splitAt > 0) {
      const keep = lines.slice(0, splitAt).join("\n").trimEnd();
      const move = lines.slice(splitAt).join("\n").trimStart();

      if (move) {
        result[i] = { ...result[i], markdownContent: keep };
        result[i + 1] = {
          ...result[i + 1],
          markdownContent: move + "\n" + result[i + 1].markdownContent,
        };
      }
    }
  }

  return result;
}

// --- helpers ---

function mergeSourceInfo(infoA: string, infoB: string): string {
  if (!infoA) return infoB;
  if (!infoB) return infoA;
  if (infoA === infoB) return infoA;

  // Try to merge page ranges: "Pages 1-3" + "Pages 4-6" -> "Pages 1-6"
  const pageRangeRegex = /^Pages?\s+(\d+)(?:-(\d+))?$/i;
  const matchA = infoA.match(pageRangeRegex);
  const matchB = infoB.match(pageRangeRegex);

  if (matchA && matchB) {
    const startA = parseInt(matchA[1], 10);
    const endA = matchA[2] ? parseInt(matchA[2], 10) : startA;
    const startB = parseInt(matchB[1], 10);
    const endB = matchB[2] ? parseInt(matchB[2], 10) : startB;
    const start = Math.min(startA, startB);
    const end = Math.max(endA, endB);
    return start === end ? `Page ${start}` : `Pages ${start}-${end}`;
  }

  // Try to merge slide numbers: "Slide 3" + "Slide 4" -> "Slides 3-4"
  const slideRegex = /^Slides?\s+(\d+)(?:-(\d+))?$/i;
  const matchSlideA = infoA.match(slideRegex);
  const matchSlideB = infoB.match(slideRegex);

  if (matchSlideA && matchSlideB) {
    const startA = parseInt(matchSlideA[1], 10);
    const endA = matchSlideA[2] ? parseInt(matchSlideA[2], 10) : startA;
    const startB = parseInt(matchSlideB[1], 10);
    const endB = matchSlideB[2] ? parseInt(matchSlideB[2], 10) : startB;
    const start = Math.min(startA, startB);
    const end = Math.max(endA, endB);
    return start === end ? `Slide ${start}` : `Slides ${start}-${end}`;
  }

  return `${infoA}, ${infoB}`;
}
