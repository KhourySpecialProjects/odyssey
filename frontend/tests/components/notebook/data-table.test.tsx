/**
 * Tests for the interactive DataTable component.
 *
 * NOTE: @tanstack/react-table must be installed before these tests can run.
 * Run: cd frontend && npm install
 *
 * We test the component with the real TanStack Table library (not mocked)
 * because the sorting / filtering / pagination behavior is the whole point.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataTable } from "@/components/notebook/data-table/data-table";
import type { ParsedDataset } from "@/lib/dataset-parser";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockDataset: ParsedDataset = {
  columnNames: ["name", "age", "score"],
  columnTypes: ["string", "number", "number"],
  rows: [
    ["Alice", "30", "95.5"],
    ["Bob", "25", "87.0"],
    ["Charlie", "35", "92.3"],
    ["Diana", "28", "88.7"],
    ["Eve", "22", "99.1"],
  ],
  rowCount: 5,
  columnCount: 3,
  preview: [
    ["Alice", "30", "95.5"],
    ["Bob", "25", "87.0"],
  ],
};

const mockLargeDataset: ParsedDataset = {
  columnNames: ["id", "value"],
  columnTypes: ["number", "string"],
  rows: Array.from({ length: 60 }, (_, i) => [String(i + 1), `Value ${i + 1}`]),
  rowCount: 60,
  columnCount: 2,
  preview: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("score")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows row count and column count in footer", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(screen.getByText(/5 rows/i)).toBeInTheDocument();
    expect(screen.getByText(/3 columns/i)).toBeInTheDocument();
  });

  it("renders global search input", () => {
    render(<DataTable dataset={mockDataset} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("filters rows via global search", () => {
    render(<DataTable dataset={mockDataset} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.change(searchInput, { target: { value: "Alice" } });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("restores all rows when search is cleared", () => {
    render(<DataTable dataset={mockDataset} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.change(searchInput, { target: { value: "Alice" } });
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders rows per page label in toolbar", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
  });

  it("renders page size buttons (25, 50, 100)", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(
      screen.getByRole("button", { name: /show 25 rows/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show 50 rows/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show 100 rows/i }),
    ).toBeInTheDocument();
  });

  it("renders sorting buttons on column headers", () => {
    render(<DataTable dataset={mockDataset} />);
    // Each column header should be a button
    const nameButton = screen.getByText("name").closest("button");
    expect(nameButton).toBeTruthy();
  });

  it("shows correct number of rows per page (default 25) on large dataset", () => {
    render(<DataTable dataset={mockLargeDataset} />);
    const rows = screen.getAllByRole("row");
    // rows includes: 1 header row + 1 filter row + 25 data rows = 27 total
    const dataRows = rows.length - 2; // subtract header and filter rows
    expect(dataRows).toBe(25);
  });

  it("renders pagination controls for large datasets", () => {
    render(<DataTable dataset={mockLargeDataset} />);
    expect(screen.getByLabelText(/go to next page/i)).toBeInTheDocument();
  });

  it("shows page indicator for paginated data", () => {
    render(<DataTable dataset={mockLargeDataset} />);
    // Should show "Page X of Y" text
    expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
  });

  it("navigates to next page", () => {
    render(<DataTable dataset={mockLargeDataset} />);
    const nextButton = screen.getByLabelText(/go to next page/i);
    fireEvent.click(nextButton);
    expect(screen.getByText(/page 2 of/i)).toBeInTheDocument();
  });

  it("renders with empty dataset without crashing", () => {
    const emptyDataset: ParsedDataset = {
      columnNames: [],
      columnTypes: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      preview: [],
    };
    render(<DataTable dataset={emptyDataset} />);
    expect(screen.getByText(/0 rows/i)).toBeInTheDocument();
  });

  it("renders with single-column dataset", () => {
    const singleColDataset: ParsedDataset = {
      columnNames: ["value"],
      columnTypes: ["string"],
      rows: [["foo"], ["bar"]],
      rowCount: 2,
      columnCount: 1,
      preview: [],
    };
    render(<DataTable dataset={singleColDataset} />);
    expect(screen.getByText("value")).toBeInTheDocument();
    expect(screen.getByText("foo")).toBeInTheDocument();
    expect(screen.getByText("bar")).toBeInTheDocument();
  });

  it("shows no-results message when search finds nothing", () => {
    render(<DataTable dataset={mockDataset} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "zzznomatch" } });
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("renders per-column filter inputs", () => {
    render(<DataTable dataset={mockDataset} />);
    expect(screen.getByLabelText(/filter name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter score/i)).toBeInTheDocument();
  });

  it("filters rows via per-column filter", () => {
    render(<DataTable dataset={mockDataset} />);
    const nameFilter = screen.getByLabelText(/filter name/i);

    fireEvent.change(nameFilter, { target: { value: "Bob" } });

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});
