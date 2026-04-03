/**
 * PPTX extractor tests.
 *
 * Uses real JSZip to build mini PPTX archives in-memory.
 * Now tests raw text extraction (no section splitting).
 */

import JSZip from "jszip";
import { extractTextFromPPTX } from "../pptx-extractor";

function buildSlideXML(options: {
  title?: string;
  bodyItems?: Array<{ text: string; level?: number }>;
}): string {
  const titleShape = options.title
    ? `<p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>${options.title}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>`
    : "";

  const bodyItems = (options.bodyItems ?? [])
    .map(
      ({ text, level = 0 }) =>
        `<a:p><a:pPr lvl="${level}"/><a:r><a:t>${text}</a:t></a:r></a:p>`,
    )
    .join("\n");

  const bodyShape = bodyItems
    ? `<p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          ${bodyItems}
        </p:txBody>
      </p:sp>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      ${titleShape}
      ${bodyShape}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

async function buildPPTXFile(
  slides: Array<{
    title?: string;
    bodyItems?: Array<{ text: string; level?: number }>;
  }>,
  filename = "test.pptx",
): Promise<File> {
  const zip = new JSZip();
  slides.forEach((slide, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, buildSlideXML(slide));
  });
  const content = await zip.generateAsync({ type: "uint8array" });
  return new File([content], filename);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("extractTextFromPPTX", () => {
  it("throws for files larger than 25MB", async () => {
    const largeContent = new Uint8Array(26 * 1024 * 1024).fill(65);
    const file = new File([largeContent], "large.pptx");
    await expect(extractTextFromPPTX(file)).rejects.toThrow(
      "File is too large",
    );
  });

  it("extracts text with slide markers in order", async () => {
    const file = await buildPPTXFile([
      { title: "First Slide", bodyItems: [{ text: "Content A" }] },
      { title: "Second Slide", bodyItems: [{ text: "Content B" }] },
    ]);

    const result = await extractTextFromPPTX(file);

    expect(result.text).toContain("--- Slide 1 ---");
    expect(result.text).toContain("# First Slide");
    expect(result.text).toContain("- Content A");
    expect(result.text).toContain("--- Slide 2 ---");
    expect(result.text).toContain("# Second Slide");
    expect(result.text).toContain("- Content B");
  });

  it("maps titles to markdown headings", async () => {
    const file = await buildPPTXFile([
      { title: "My Title", bodyItems: [{ text: "Body text" }] },
    ]);

    const result = await extractTextFromPPTX(file);
    expect(result.text).toContain("# My Title");
  });

  it("formats body items as bullets with indentation", async () => {
    const file = await buildPPTXFile([
      {
        title: "Bullets",
        bodyItems: [
          { text: "Item one", level: 0 },
          { text: "Sub item", level: 1 },
        ],
      },
    ]);

    const result = await extractTextFromPPTX(file);
    expect(result.text).toContain("- Item one");
    expect(result.text).toContain("  - Sub item");
  });

  it("skips empty slides and records warnings", async () => {
    const file = await buildPPTXFile([
      { title: "Good Slide", bodyItems: [{ text: "Content" }] },
      {},
    ]);

    const result = await extractTextFromPPTX(file);

    expect(result.text).toContain("Good Slide");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Slide 2");
  });

  it("throws when all slides are empty", async () => {
    const file = await buildPPTXFile([{}, {}]);
    await expect(extractTextFromPPTX(file)).rejects.toThrow(
      "No text content could be extracted",
    );
  });

  it("throws when there are no slides", async () => {
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", "<presentation/>");
    const content = await zip.generateAsync({ type: "uint8array" });
    const file = new File([content], "noslides.pptx");

    await expect(extractTextFromPPTX(file)).rejects.toThrow("No slides found");
  });

  it("throws for corrupt ZIP", async () => {
    const file = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03])],
      "corrupt.pptx",
    );
    await expect(extractTextFromPPTX(file)).rejects.toThrow(
      "Failed to read the PPTX file",
    );
  });

  it("extracts text from slides without title placeholder", async () => {
    const zip = new JSZip();
    const slideXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>Just body text here</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    zip.file("ppt/slides/slide1.xml", slideXML);
    const content = await zip.generateAsync({ type: "uint8array" });
    const file = new File([content], "notitle.pptx");

    const result = await extractTextFromPPTX(file);
    expect(result.text).toContain("Just body text here");
  });
});
