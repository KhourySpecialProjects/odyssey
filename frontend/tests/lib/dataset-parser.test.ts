/**
 * Tests for frontend/lib/dataset-parser.ts
 *
 * papaparse and xlsx-js-style are mocked so the tests run without those
 * packages being installed in the test environment. The mock shapes mirror
 * the real APIs closely enough to verify the parser logic.
 */

// ---------------------------------------------------------------------------
// Mock papaparse BEFORE any imports
// virtual: true is required because papaparse may not be installed yet.
// ---------------------------------------------------------------------------
jest.mock(
  "papaparse",
  () => ({
    __esModule: true,
    default: {
      parse: jest.fn(),
    },
  }),
  { virtual: true },
);

// ---------------------------------------------------------------------------
// Mock xlsx-js-style BEFORE any imports
// ---------------------------------------------------------------------------
jest.mock("xlsx-js-style", () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

import Papa from "papaparse";
import * as XLSX from "xlsx-js-style";

import {
  parseCSV,
  parseJSON,
  parseExcel,
  parseDatasetFile,
  inferColumnTypes,
  computeSummaryStats,
  type ParsedDataset,
  type SummaryStats,
} from "@/lib/dataset-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal File-like object.
 * jsdom's File implementation is good enough here.
 */
function makeFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

/**
 * FileReader is used inside the parser. jsdom implements FileReader but the
 * async onload callback needs to fire synchronously in jest. We replace
 * FileReader with a controlled fake.
 */
class FakeFileReader {
  onload: ((e: { target: { result: string | ArrayBuffer } }) => void) | null =
    null;
  onerror: (() => void) | null = null;

  private _result: string | ArrayBuffer = "";

  set _nextResult(v: string | ArrayBuffer) {
    this._result = v;
  }

  readAsText() {
    Promise.resolve().then(() => {
      this.onload?.({ target: { result: this._result as string } });
    });
  }

  readAsArrayBuffer() {
    Promise.resolve().then(() => {
      this.onload?.({ target: { result: this._result as ArrayBuffer } });
    });
  }
}

/** Install a FakeFileReader that returns `result` for the next read. */
function mockFileReader(result: string | ArrayBuffer) {
  const fake = new FakeFileReader();
  fake._nextResult = result;
  (global as unknown as Record<string, unknown>).FileReader = jest.fn(
    () => fake,
  );
  return fake;
}

// ---------------------------------------------------------------------------
// inferColumnTypes
// ---------------------------------------------------------------------------

describe("inferColumnTypes", () => {
  it("infers number columns", () => {
    const rows = [["1"], ["2.5"], ["100"]];
    const types = inferColumnTypes(rows, ["value"]);
    expect(types).toEqual(["number"]);
  });

  it("infers string columns", () => {
    const rows = [["hello"], ["world"]];
    const types = inferColumnTypes(rows, ["name"]);
    expect(types).toEqual(["string"]);
  });

  it("infers boolean columns", () => {
    const rows = [["true"], ["false"], ["TRUE"]];
    const types = inferColumnTypes(rows, ["flag"]);
    expect(types).toEqual(["boolean"]);
  });

  it("infers date columns (ISO 8601)", () => {
    const rows = [["2024-01-15"], ["2024-06-30"]];
    const types = inferColumnTypes(rows, ["date"]);
    expect(types).toEqual(["date"]);
  });

  it("returns unknown for all-null columns", () => {
    const rows = [[null], [null], [""]];
    const types = inferColumnTypes(rows, ["empty"]);
    expect(types).toEqual(["unknown"]);
  });

  it("returns string for mixed number/string columns", () => {
    const rows = [["42"], ["hello"], ["100"]];
    const types = inferColumnTypes(rows, ["mixed"]);
    expect(types).toEqual(["string"]);
  });

  it("handles multiple columns independently", () => {
    const rows = [
      ["Alice", "30"],
      ["Bob", "25"],
    ];
    const types = inferColumnTypes(rows, ["name", "age"]);
    expect(types).toEqual(["string", "number"]);
  });

  it("samples only the first 100 rows", () => {
    // Build 150 rows: first 100 are numbers, last 50 are strings
    const rows: unknown[][] = [];
    for (let i = 0; i < 100; i++) rows.push([String(i)]);
    for (let i = 0; i < 50; i++) rows.push(["text"]);
    const types = inferColumnTypes(rows, ["col"]);
    // Only first 100 rows are sampled — all numbers → "number"
    expect(types).toEqual(["number"]);
  });

  it("returns unknown for empty rows array", () => {
    const types = inferColumnTypes([], ["col"]);
    expect(types).toEqual(["unknown"]);
  });
});

// ---------------------------------------------------------------------------
// computeSummaryStats
// ---------------------------------------------------------------------------

describe("computeSummaryStats", () => {
  it("returns correct shape", () => {
    const rows = [
      [1, "a"],
      [2, "b"],
      [3, "c"],
    ];
    const stats = computeSummaryStats(
      rows,
      ["num", "str"],
      ["number", "string"],
    );
    expect(stats.shape).toEqual([3, 2]);
  });

  it("computes numeric stats: min, max, mean, median, std", () => {
    const rows = [[1], [2], [3], [4], [5]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);
    const col = stats.columns[0];

    expect(col.min).toBe(1);
    expect(col.max).toBe(5);
    expect(col.mean).toBe(3);
    expect(col.median).toBe(3);
    // Population std of [1,2,3,4,5] = sqrt(2) ≈ 1.414
    expect(col.std).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("computes median for even-length numeric columns", () => {
    const rows = [[1], [2], [3], [4]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);
    expect(stats.columns[0].median).toBe(2.5);
  });

  it("counts null values correctly", () => {
    const rows = [[1], [null], [""], [2]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);
    expect(stats.columns[0].nullCount).toBe(2); // null and ""
  });

  it("counts unique non-null values", () => {
    const rows = [["a"], ["b"], ["a"], ["c"]];
    const stats = computeSummaryStats(rows, ["x"], ["string"]);
    expect(stats.columns[0].uniqueCount).toBe(3); // "a", "b", "c"
  });

  it("does not compute numeric stats for string columns", () => {
    const rows = [["hello"], ["world"]];
    const stats = computeSummaryStats(rows, ["x"], ["string"]);
    const col = stats.columns[0];
    expect(col.min).toBeUndefined();
    expect(col.max).toBeUndefined();
    expect(col.mean).toBeUndefined();
    expect(col.median).toBeUndefined();
    expect(col.std).toBeUndefined();
  });

  it("handles all-null column in numeric stats gracefully", () => {
    const rows = [[null], [null]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);
    const col = stats.columns[0];
    // No numeric values → numeric stats are not set
    expect(col.min).toBeUndefined();
    expect(col.max).toBeUndefined();
  });

  it("handles empty rows array", () => {
    const stats = computeSummaryStats([], ["x"], ["number"]);
    expect(stats.shape).toEqual([0, 1]);
    expect(stats.columns[0].nullCount).toBe(0);
  });

  it("handles single row, single column", () => {
    const rows = [[42]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);
    expect(stats.shape).toEqual([1, 1]);
    expect(stats.columns[0].min).toBe(42);
    expect(stats.columns[0].max).toBe(42);
    expect(stats.columns[0].std).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------

describe("parseCSV", () => {
  const papaMock = Papa.parse as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses basic CSV with header", async () => {
    mockFileReader("name,age\nAlice,30\nBob,25");

    papaMock.mockReturnValue({
      data: [
        { name: "Alice", age: "30" },
        { name: "Bob", age: "25" },
      ],
      meta: { fields: ["name", "age"] },
      errors: [],
    });

    const file = makeFile("name,age\nAlice,30\nBob,25", "data.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.columnNames).toEqual(["name", "age"]);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(2);
    expect(result.rows[0]).toEqual(["Alice", "30"]);
    expect(result.rows[1]).toEqual(["Bob", "25"]);
    expect(result.preview).toHaveLength(2);
  });

  it("detects column types (string + number)", async () => {
    mockFileReader("");

    papaMock.mockReturnValue({
      data: [
        { name: "Alice", age: "30" },
        { name: "Bob", age: "25" },
      ],
      meta: { fields: ["name", "age"] },
      errors: [],
    });

    const file = makeFile("", "data.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.columnTypes).toEqual(["string", "number"]);
  });

  it("returns preview of first 5 rows only", async () => {
    mockFileReader("");

    const data = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    papaMock.mockReturnValue({
      data,
      meta: { fields: ["id"] },
      errors: [],
    });

    const file = makeFile("", "data.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.preview).toHaveLength(5);
  });

  it("handles empty data (header only)", async () => {
    mockFileReader("");

    papaMock.mockReturnValue({
      data: [],
      meta: { fields: ["name", "age"] },
      errors: [],
    });

    const file = makeFile("name,age", "empty.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.rowCount).toBe(0);
    expect(result.columnNames).toEqual(["name", "age"]);
    expect(result.rows).toEqual([]);
  });

  it("handles cells with null/missing values", async () => {
    mockFileReader("");

    papaMock.mockReturnValue({
      data: [
        { name: "Alice", age: undefined },
        { name: "Bob", age: "25" },
      ],
      meta: { fields: ["name", "age"] },
      errors: [],
    });

    const file = makeFile("", "data.csv", "text/csv");
    const result = await parseCSV(file);

    // Missing value becomes null
    expect(result.rows[0][1]).toBeNull();
    expect(result.rows[1][1]).toBe("25");
  });

  it("throws descriptive error for malformed CSV with delimiter error", async () => {
    mockFileReader("");

    papaMock.mockReturnValue({
      data: [],
      meta: { fields: [] },
      errors: [
        { type: "Delimiter", message: "Unable to auto-detect delimiter" },
      ],
    });

    const file = makeFile("", "bad.csv", "text/csv");
    await expect(parseCSV(file)).rejects.toThrow(/Malformed CSV/);
  });

  it("parses CSV with quoted fields", async () => {
    mockFileReader("");

    papaMock.mockReturnValue({
      data: [{ text: 'Hello, "world"' }],
      meta: { fields: ["text"] },
      errors: [],
    });

    const file = makeFile("", "quoted.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.rows[0][0]).toBe('Hello, "world"');
  });
});

// ---------------------------------------------------------------------------
// parseJSON
// ---------------------------------------------------------------------------

describe("parseJSON", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses an array of objects", async () => {
    const jsonContent = JSON.stringify([
      { name: "Alice", score: 95 },
      { name: "Bob", score: 87 },
    ]);

    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "data.json", "application/json");
    const result = await parseJSON(file);

    expect(result.columnNames).toEqual(["name", "score"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]).toEqual(["Alice", 95]);
    expect(result.rows[1]).toEqual(["Bob", 87]);
  });

  it("parses { data: [...] } wrapper format", async () => {
    const jsonContent = JSON.stringify({
      data: [
        { id: 1, label: "foo" },
        { id: 2, label: "bar" },
      ],
    });

    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "data.json", "application/json");
    const result = await parseJSON(file);

    expect(result.rowCount).toBe(2);
    expect(result.columnNames).toEqual(["id", "label"]);
  });

  it("infers column types from JSON data", async () => {
    const jsonContent = JSON.stringify([
      { name: "Alice", age: 30, active: true },
    ]);

    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "data.json", "application/json");
    const result = await parseJSON(file);

    expect(result.columnTypes[0]).toBe("string"); // name
    expect(result.columnTypes[1]).toBe("number"); // age
    expect(result.columnTypes[2]).toBe("boolean"); // active
  });

  it("handles empty array", async () => {
    const jsonContent = "[]";
    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "empty.json", "application/json");
    const result = await parseJSON(file);

    expect(result.rowCount).toBe(0);
    expect(result.columnNames).toEqual([]);
  });

  it("throws on invalid JSON", async () => {
    mockFileReader("{ not valid json }}}");

    const file = makeFile(
      "{ not valid json }}}",
      "bad.json",
      "application/json",
    );
    await expect(parseJSON(file)).rejects.toThrow(/Invalid JSON/);
  });

  it("throws on JSON that is neither array nor { data: [...] }", async () => {
    const jsonContent = JSON.stringify({ foo: "bar", baz: 42 });
    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "wrong.json", "application/json");
    await expect(parseJSON(file)).rejects.toThrow(/Invalid JSON dataset/);
  });

  it("fills missing column values with null", async () => {
    const jsonContent = JSON.stringify([
      { name: "Alice", age: 30 },
      { name: "Bob" }, // age missing
    ]);

    mockFileReader(jsonContent);

    const file = makeFile(jsonContent, "data.json", "application/json");
    const result = await parseJSON(file);

    // Column order derived from first object
    expect(result.rows[1][1]).toBeNull(); // age is null for Bob
  });
});

// ---------------------------------------------------------------------------
// parseExcel
// ---------------------------------------------------------------------------

describe("parseExcel", () => {
  const xlsxReadMock = XLSX.read as jest.Mock;
  const sheetToJsonMock = XLSX.utils.sheet_to_json as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses a basic Excel file with header row", async () => {
    mockFileReader(new ArrayBuffer(8)); // dummy buffer

    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });

    sheetToJsonMock.mockReturnValue([
      ["name", "score"],
      ["Alice", 95],
      ["Bob", 87],
    ]);

    const file = makeFile(
      "",
      "data.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const result = await parseExcel(file);

    expect(result.columnNames).toEqual(["name", "score"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]).toEqual(["Alice", 95]);
    expect(result.rows[1]).toEqual(["Bob", 87]);
  });

  it("pads short rows to column count", async () => {
    mockFileReader(new ArrayBuffer(8));

    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });

    // Row 2 is shorter than row 1 (header has 3 columns, data row has 2)
    sheetToJsonMock.mockReturnValue([
      ["a", "b", "c"],
      ["x", "y"], // missing 3rd value
    ]);

    const file = makeFile(
      "",
      "data.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const result = await parseExcel(file);

    expect(result.rows[0]).toHaveLength(3);
    expect(result.rows[0][2]).toBeNull(); // padded with null
  });

  it("returns empty dataset when sheet is empty", async () => {
    mockFileReader(new ArrayBuffer(8));

    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });

    sheetToJsonMock.mockReturnValue([]);

    const file = makeFile(
      "",
      "empty.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const result = await parseExcel(file);

    expect(result.rowCount).toBe(0);
    expect(result.columnNames).toEqual([]);
  });

  it("throws on corrupt Excel file", async () => {
    mockFileReader(new ArrayBuffer(8));

    xlsxReadMock.mockImplementation(() => {
      throw new Error("Bad zip");
    });

    const file = makeFile(
      "",
      "corrupt.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    await expect(parseExcel(file)).rejects.toThrow(
      /Corrupt or unsupported Excel file/,
    );
  });

  it("throws when Excel file has no sheets", async () => {
    mockFileReader(new ArrayBuffer(8));

    xlsxReadMock.mockReturnValue({
      SheetNames: [],
      Sheets: {},
    });

    const file = makeFile(
      "",
      "nosheet.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    await expect(parseExcel(file)).rejects.toThrow(/no sheets/);
  });

  it("extracts only the first sheet", async () => {
    mockFileReader(new ArrayBuffer(8));

    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1", "Sheet2"],
      Sheets: {
        Sheet1: {},
        Sheet2: {},
      },
    });

    sheetToJsonMock.mockReturnValue([["col"], ["val"]]);

    const file = makeFile(
      "",
      "multi.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    await parseExcel(file);

    // sheet_to_json should only be called with Sheet1's worksheet object
    expect(sheetToJsonMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// parseDatasetFile (dispatcher)
// ---------------------------------------------------------------------------

describe("parseDatasetFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispatches .csv files to parseCSV", async () => {
    mockFileReader("name\nAlice");

    (Papa.parse as jest.Mock).mockReturnValue({
      data: [{ name: "Alice" }],
      meta: { fields: ["name"] },
      errors: [],
    });

    const file = makeFile("name\nAlice", "test.csv", "text/csv");
    const result = await parseDatasetFile(file);

    expect(result.columnNames).toEqual(["name"]);
    expect(Papa.parse).toHaveBeenCalledTimes(1);
  });

  it("dispatches .json files to parseJSON", async () => {
    const json = JSON.stringify([{ x: 1 }]);
    mockFileReader(json);

    const file = makeFile(json, "test.json", "application/json");
    const result = await parseDatasetFile(file);

    expect(result.columnNames).toEqual(["x"]);
  });

  it("dispatches .xlsx files to parseExcel", async () => {
    mockFileReader(new ArrayBuffer(8));

    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });

    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([["col"], ["val"]]);

    const file = makeFile(
      "",
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const result = await parseDatasetFile(file);

    expect(result.columnNames).toEqual(["col"]);
    expect(XLSX.read).toHaveBeenCalledTimes(1);
  });

  it("throws for unsupported file formats", async () => {
    const file = makeFile("", "data.txt", "text/plain");
    await expect(parseDatasetFile(file)).rejects.toThrow(
      /Unsupported file format/,
    );
  });

  it("throws for .pdf files", async () => {
    const file = makeFile("", "report.pdf", "application/pdf");
    await expect(parseDatasetFile(file)).rejects.toThrow(
      /Unsupported file format/,
    );
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles single column dataset via CSV", async () => {
    mockFileReader("");

    (Papa.parse as jest.Mock).mockReturnValue({
      data: [{ value: "100" }, { value: "200" }],
      meta: { fields: ["value"] },
      errors: [],
    });

    const file = makeFile("", "single.csv", "text/csv");
    const result = await parseCSV(file);

    expect(result.columnCount).toBe(1);
    expect(result.columnNames).toEqual(["value"]);
  });

  it("handles single row dataset via JSON", async () => {
    const json = JSON.stringify([{ id: 1, label: "only" }]);
    mockFileReader(json);

    const file = makeFile(json, "single-row.json", "application/json");
    const result = await parseJSON(file);

    expect(result.rowCount).toBe(1);
    expect(result.preview).toHaveLength(1);
  });

  it("computes summary stats for a dataset with an all-null numeric column", () => {
    const rows = [[null], [null], [null]];
    const stats = computeSummaryStats(rows, ["x"], ["number"]);

    expect(stats.columns[0].nullCount).toBe(3);
    expect(stats.columns[0].uniqueCount).toBe(0);
    expect(stats.columns[0].min).toBeUndefined();
  });
});
