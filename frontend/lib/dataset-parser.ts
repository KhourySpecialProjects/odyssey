import Papa from "papaparse";
import * as XLSX from "xlsx-js-style";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedDataset = {
  /** Array of row arrays (not objects, for table performance). */
  rows: unknown[][];
  columnNames: string[];
  columnTypes: string[];
  rowCount: number;
  columnCount: number;
  /** First 5 rows for upload preview. */
  preview: unknown[][];
};

export type ColumnStats = {
  name: string;
  type: string;
  nullCount: number;
  uniqueCount: number;
  // Numeric columns only:
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
};

export type SummaryStats = {
  /** [rows, cols] */
  shape: [number, number];
  columns: ColumnStats[];
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read a File as text (UTF-8). */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Failed to read file as text"));
    reader.readAsText(file, "utf-8");
  });
}

/** Read a File as an ArrayBuffer. */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      resolve((e.target?.result as ArrayBuffer) ?? new ArrayBuffer(0));
    reader.onerror = () =>
      reject(new Error("Failed to read file as ArrayBuffer"));
    reader.readAsArrayBuffer(file);
  });
}

/** Determine whether a cell value is null/empty. */
function isNullValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,
];

/** Infer the type of a single cell value. */
function inferCellType(value: unknown): string {
  if (isNullValue(value)) return "unknown";

  const str = String(value).trim();

  // Boolean
  if (str === "true" || str === "false" || str === "TRUE" || str === "FALSE") {
    return "boolean";
  }

  // Number
  if (!isNaN(Number(str)) && str !== "") {
    return "number";
  }

  if (DATE_PATTERNS.some((p) => p.test(str))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return "date";
  }

  return "string";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV file using PapaParse.
 * Throws a descriptive Error on malformed input.
 */
export async function parseCSV(file: File): Promise<ParsedDataset> {
  const text = await readFileAsText(file);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // keep everything as strings so we infer types ourselves
  });

  if (result.errors && result.errors.length > 0) {
    const firstFatal = result.errors.find((e) => e.type === "Delimiter");
    if (firstFatal) {
      throw new Error(`Malformed CSV: ${firstFatal.message}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    // Only headers, no data rows — still valid
    const columnNames = result.meta.fields ?? [];
    return {
      rows: [],
      columnNames,
      columnTypes: columnNames.map(() => "unknown"),
      rowCount: 0,
      columnCount: columnNames.length,
      preview: [],
    };
  }

  const columnNames = result.meta.fields ?? Object.keys(result.data[0]);
  const rows: unknown[][] = result.data.map((row) =>
    columnNames.map((col) => row[col] ?? null),
  );

  const columnTypes = inferColumnTypes(rows, columnNames);

  return {
    rows,
    columnNames,
    columnTypes,
    rowCount: rows.length,
    columnCount: columnNames.length,
    preview: rows.slice(0, 5),
  };
}

/**
 * Parse a JSON file.
 * Accepts:
 *   - An array of objects: `[{...}, ...]`
 *   - A `{ data: [...] }` wrapper
 * Throws a descriptive Error on invalid JSON.
 */
export async function parseJSON(file: File): Promise<ParsedDataset> {
  const text = await readFileAsText(file);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON: could not parse file");
  }

  let records: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    records = parsed as Record<string, unknown>[];
  } else if (
    parsed !== null &&
    typeof parsed === "object" &&
    "data" in (parsed as object) &&
    Array.isArray((parsed as { data: unknown }).data)
  ) {
    records = (parsed as { data: Record<string, unknown>[] }).data;
  } else {
    throw new Error(
      "Invalid JSON dataset: expected an array of objects or { data: [...] }",
    );
  }

  if (records.length === 0) {
    return {
      rows: [],
      columnNames: [],
      columnTypes: [],
      rowCount: 0,
      columnCount: 0,
      preview: [],
    };
  }

  const columnNames = Object.keys(records[0]);
  const rows: unknown[][] = records.map((record) =>
    columnNames.map((col) => record[col] ?? null),
  );

  const columnTypes = inferColumnTypes(rows, columnNames);

  return {
    rows,
    columnNames,
    columnTypes,
    rowCount: rows.length,
    columnCount: columnNames.length,
    preview: rows.slice(0, 5),
  };
}

/**
 * Parse an Excel (.xlsx) file using xlsx-js-style.
 * Uses the first sheet.
 * Throws a descriptive Error on corrupt or unsupported files.
 */
export async function parseExcel(file: File): Promise<ParsedDataset> {
  let buffer: ArrayBuffer;
  try {
    buffer = await readFileAsArrayBuffer(file);
  } catch {
    throw new Error("Failed to read Excel file");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new Error("Corrupt or unsupported Excel file");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file contains no sheets");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  if (rawData.length === 0) {
    return {
      rows: [],
      columnNames: [],
      columnTypes: [],
      rowCount: 0,
      columnCount: 0,
      preview: [],
    };
  }

  const headerRow = rawData[0] as string[];
  const columnNames = headerRow.map((h) => (h != null ? String(h) : ""));
  const rows = rawData.slice(1);

  // Pad short rows to full column count
  const paddedRows: unknown[][] = rows.map((row) => {
    const padded = [...(row as unknown[])];
    while (padded.length < columnNames.length) {
      padded.push(null);
    }
    return padded;
  });

  const columnTypes = inferColumnTypes(paddedRows, columnNames);

  return {
    rows: paddedRows,
    columnNames,
    columnTypes,
    rowCount: paddedRows.length,
    columnCount: columnNames.length,
    preview: paddedRows.slice(0, 5),
  };
}

/**
 * Dispatch to the appropriate parser based on file extension.
 * Throws if the format is unsupported.
 */
export async function parseDatasetFile(file: File): Promise<ParsedDataset> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    return parseCSV(file);
  }

  if (name.endsWith(".json")) {
    return parseJSON(file);
  }

  if (name.endsWith(".xlsx")) {
    return parseExcel(file);
  }

  throw new Error(
    `Unsupported file format: ${file.name}. Supported formats: CSV, JSON, Excel (.xlsx)`,
  );
}

/**
 * Infer column types by sampling up to the first 100 rows.
 * Returns an array of type strings parallel to `columnNames`.
 * Possible types: "number" | "boolean" | "date" | "string" | "unknown"
 */
export function inferColumnTypes(
  rows: unknown[][],
  columnNames: string[],
): string[] {
  const sampleRows = rows.slice(0, 100);

  return columnNames.map((_, colIdx) => {
    const types = new Set<string>();

    for (const row of sampleRows) {
      const value = row[colIdx];
      if (!isNullValue(value)) {
        types.add(inferCellType(value));
      }
    }

    // Remove "unknown" from the set of non-null types
    const nonNull = [...types].filter((t) => t !== "unknown");

    if (nonNull.length === 0) return "unknown";
    if (nonNull.length === 1) return nonNull[0];

    // Mixed types: if all are number/boolean treat as string; otherwise string
    return "string";
  });
}

/**
 * Compute per-column summary statistics.
 * Numeric distributions (min/max/mean/median/std) are only computed for
 * columns whose inferred type is "number".
 */
export function computeSummaryStats(
  rows: unknown[][],
  columnNames: string[],
  columnTypes: string[],
): SummaryStats {
  const shape: [number, number] = [rows.length, columnNames.length];

  const columns: ColumnStats[] = columnNames.map((name, colIdx) => {
    const type = columnTypes[colIdx] ?? "unknown";
    const values = rows.map((row) => row[colIdx]);

    const nullCount = values.filter(isNullValue).length;
    const nonNullValues = values.filter((v) => !isNullValue(v));
    const uniqueCount = new Set(nonNullValues.map((v) => String(v))).size;

    const stats: ColumnStats = { name, type, nullCount, uniqueCount };

    if (type === "number" && nonNullValues.length > 0) {
      const nums = nonNullValues
        .map((v) => Number(v))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (nums.length > 0) {
        stats.min = nums[0];
        stats.max = nums[nums.length - 1];
        stats.mean = nums.reduce((s, n) => s + n, 0) / nums.length;

        // Median
        const mid = Math.floor(nums.length / 2);
        stats.median =
          nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];

        // Standard deviation (population)
        const mean = stats.mean;
        const variance =
          nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
        stats.std = Math.sqrt(variance);
      }
    }

    return stats;
  });

  return { shape, columns };
}
