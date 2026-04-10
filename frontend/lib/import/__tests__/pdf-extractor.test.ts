import { extractTextFromPDF } from "../pdf-extractor";

const mockGetDocument = jest.fn();
const mockPdfjs = {
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: mockGetDocument,
  OPS: {},
};

// Mock the CDN dynamic import — Jest resolves the webpackIgnore import as a
// normal dynamic import, so we intercept the CDN URL and return our mock.
jest.mock(
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.min.mjs",
  () => mockPdfjs,
  { virtual: true },
);

// Mock fetch for the worker blob download
global.fetch = jest.fn().mockResolvedValue({
  text: () => Promise.resolve("// worker stub"),
}) as unknown as typeof fetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue("blob:worker-stub");

// Helper to build a mock pdfjs text item
function makeItem(str: string, fontSize: number, x: number, y: number): object {
  return {
    str,
    transform: [1, 0, 0, fontSize, x, y],
    width: 10,
    height: fontSize,
  };
}

function makeMockPage(items: object[]) {
  return {
    getTextContent: jest.fn().mockResolvedValue({ items }),
  };
}

function makeMockDoc(pages: object[][]) {
  return {
    numPages: pages.length,
    getPage: jest
      .fn()
      .mockImplementation(async (pageNum: number) =>
        makeMockPage(pages[pageNum - 1]),
      ),
  };
}

function makeFile(name: string, size = 1000): File {
  const content = new Uint8Array(size).fill(65);
  const file = new File([content], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(content.buffer),
  });
  return file;
}

describe("extractTextFromPDF", () => {
  beforeEach(() => {
    mockGetDocument.mockReset();
  });

  it("throws an error for files larger than 25MB", async () => {
    const largeFile = makeFile("large.pdf", 26 * 1024 * 1024);
    await expect(extractTextFromPDF(largeFile)).rejects.toThrow(
      "File is too large",
    );
  });

  it("returns raw text with page markers", async () => {
    const mockDoc = makeMockDoc([
      [
        makeItem("Introduction", 24, 50, 700),
        makeItem("Body text.", 12, 50, 650),
      ],
      [makeItem("Chapter Two", 24, 50, 700)],
    ]);

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockDoc),
    });

    const file = makeFile("test.pdf");
    const result = await extractTextFromPDF(file);

    expect(result.text).toContain("--- Page 1 ---");
    expect(result.text).toContain("Introduction");
    expect(result.text).toContain("Body text.");
    expect(result.text).toContain("--- Page 2 ---");
    expect(result.text).toContain("Chapter Two");
  });

  it("adds a warning for empty pages", async () => {
    const mockDoc = makeMockDoc([
      [makeItem("Normal page content.", 12, 50, 700)],
      [],
    ]);

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockDoc),
    });

    const file = makeFile("test.pdf");
    const result = await extractTextFromPDF(file);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Page 2");
  });

  it("throws an error when all pages have no text", async () => {
    const mockDoc = makeMockDoc([[], []]);

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockDoc),
    });

    const file = makeFile("scanned.pdf");
    await expect(extractTextFromPDF(file)).rejects.toThrow(
      "No extractable text found",
    );
  });

  it("throws an error for password-protected PDFs", async () => {
    let rejectFn: (e: Error) => void = () => {};
    const lazyPromise = new Promise<never>((_resolve, reject) => {
      rejectFn = reject;
    });
    lazyPromise.catch(() => {});

    mockGetDocument.mockReturnValue({ promise: lazyPromise });

    const file = makeFile("protected.pdf");
    const extractPromise = extractTextFromPDF(file);
    rejectFn(new Error("Password required"));

    await expect(extractPromise).rejects.toThrow("password-protected");
  });

  it("throws an error for PDFs with no pages", async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 0, getPage: jest.fn() }),
    });

    const file = makeFile("empty.pdf");
    await expect(extractTextFromPDF(file)).rejects.toThrow("no pages");
  });

  it("extracts text in correct page order", async () => {
    const mockDoc = makeMockDoc([
      [makeItem("First page", 12, 50, 700)],
      [makeItem("Second page", 12, 50, 700)],
      [makeItem("Third page", 12, 50, 700)],
    ]);

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockDoc),
    });

    const file = makeFile("multi.pdf");
    const result = await extractTextFromPDF(file);

    const pageOrder = result.text.indexOf("First page");
    const page2Order = result.text.indexOf("Second page");
    const page3Order = result.text.indexOf("Third page");
    expect(pageOrder).toBeLessThan(page2Order);
    expect(page2Order).toBeLessThan(page3Order);
  });
});
