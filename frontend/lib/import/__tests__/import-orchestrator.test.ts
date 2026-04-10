/* eslint-disable @typescript-eslint/no-require-imports */
import { extractRawText, sectionsToLessons } from "../import-orchestrator";
import type { ImportSection } from "../types";

// Mock the extractors (dynamic imports)
jest.mock("../pdf-extractor", () => ({
  extractTextFromPDF: jest.fn(),
}));
jest.mock("../pptx-extractor", () => ({
  extractTextFromPPTX: jest.fn(),
}));
jest.mock("@/lib/blocknote/markdown-to-blocknote", () => ({
  parseMarkdownToBlockNote: jest.fn(),
}));

const { extractTextFromPDF } = require("../pdf-extractor");
const { extractTextFromPPTX } = require("../pptx-extractor");
const {
  parseMarkdownToBlockNote,
} = require("@/lib/blocknote/markdown-to-blocknote");

beforeEach(() => {
  jest.clearAllMocks();
});

function makeFile(name: string, size = 1000): File {
  return new File([new Uint8Array(size).fill(65)], name);
}

function makeExtractResult(text: string) {
  return { text, warnings: [] };
}

describe("extractRawText", () => {
  it("routes .pdf files to the PDF extractor", async () => {
    const mockResult = makeExtractResult("PDF text content");
    extractTextFromPDF.mockResolvedValue(mockResult);

    const file = makeFile("test.pdf");
    const result = await extractRawText(file);

    expect(extractTextFromPDF).toHaveBeenCalledWith(file);
    expect(extractTextFromPPTX).not.toHaveBeenCalled();
    expect(result.text).toBe("PDF text content");
    expect(result.fileType).toBe("pdf");
  });

  it("routes .pptx files to the PPTX extractor", async () => {
    const mockResult = makeExtractResult("PPTX text content");
    extractTextFromPPTX.mockResolvedValue(mockResult);

    const file = makeFile("slides.pptx");
    const result = await extractRawText(file);

    expect(extractTextFromPPTX).toHaveBeenCalledWith(file);
    expect(extractTextFromPDF).not.toHaveBeenCalled();
    expect(result.text).toBe("PPTX text content");
    expect(result.fileType).toBe("pptx");
  });

  it("throws for unsupported file types", async () => {
    const file = makeFile("document.docx");
    await expect(extractRawText(file)).rejects.toThrow("Unsupported file type");
  });

  it("throws for empty files", async () => {
    const file = makeFile("empty.pdf", 0);
    await expect(extractRawText(file)).rejects.toThrow("file is empty");
  });

  it("re-throws extractor errors", async () => {
    extractTextFromPDF.mockRejectedValue(
      new Error("No extractable text found in this PDF."),
    );

    const file = makeFile("scanned.pdf");
    await expect(extractRawText(file)).rejects.toThrow(
      "No extractable text found in this PDF.",
    );
  });

  it("handles case-insensitive file extensions", async () => {
    const mockResult = makeExtractResult("content");
    extractTextFromPDF.mockResolvedValue(mockResult);

    const file = makeFile("test.PDF");
    const result = await extractRawText(file);
    expect(result.fileType).toBe("pdf");
  });
});

describe("sectionsToLessons", () => {
  it("converts sections to lesson data with blocks", () => {
    const mockBlocks = [
      {
        id: "b1",
        type: "paragraph",
        props: {},
        content: [{ text: "Hello", type: "text", styles: {} }],
        children: [],
      },
    ];

    parseMarkdownToBlockNote.mockReturnValue({
      title: "Section 1",
      blocks: mockBlocks,
    });

    const sections: ImportSection[] = [
      {
        id: "s1",
        title: "Section 1",
        markdownContent: "Hello",
        sourceInfo: "Page 1",
      },
    ];

    const lessons = sectionsToLessons(sections);

    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe("Section 1");
    expect(lessons[0].blocks).toEqual(mockBlocks);
  });

  it("prepends section title as H1 when calling parseMarkdownToBlockNote", () => {
    parseMarkdownToBlockNote.mockReturnValue({ title: "T", blocks: [] });

    const sections: ImportSection[] = [
      {
        id: "s1",
        title: "My Title",
        markdownContent: "Some content",
        sourceInfo: "Slide 1",
      },
    ];

    sectionsToLessons(sections);

    expect(parseMarkdownToBlockNote).toHaveBeenCalledWith(
      "# My Title\n\nSome content",
    );
  });

  it("handles sections with empty markdown content", () => {
    parseMarkdownToBlockNote.mockReturnValue({ title: "T", blocks: [] });

    const sections: ImportSection[] = [
      {
        id: "s1",
        title: "Title Only",
        markdownContent: "",
        sourceInfo: "Slide 1",
      },
    ];

    sectionsToLessons(sections);

    expect(parseMarkdownToBlockNote).toHaveBeenCalledWith("# Title Only");
  });

  it("returns empty array for empty sections input", () => {
    const lessons = sectionsToLessons([]);
    expect(lessons).toHaveLength(0);
    expect(parseMarkdownToBlockNote).not.toHaveBeenCalled();
  });
});
