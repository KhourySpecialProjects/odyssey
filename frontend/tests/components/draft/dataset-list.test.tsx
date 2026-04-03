import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { DatasetList } from "@/components/draft/dataset/dataset-list";
import { Dataset } from "@/types";

// Mock the delete request
jest.mock("@/lib/requests/dataset", () => ({
  deleteDataset: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDatasets: Dataset[] = [
  {
    id: 1,
    name: "sales_data.csv",
    format: "csv",
    fileUrl: "https://example.com/sales.csv",
    fileSize: 10240,
    rowCount: 500,
    columnCount: 5,
    columnNames: ["id", "name", "revenue", "date", "region"],
    columnTypes: ["number", "string", "number", "date", "string"],
  },
  {
    id: 2,
    name: "products.json",
    format: "json",
    fileUrl: "https://example.com/products.json",
    fileSize: 5120,
    rowCount: 200,
    columnCount: 3,
    columnNames: ["sku", "price", "category"],
    columnTypes: ["string", "number", "string"],
  },
  {
    id: 3,
    name: "inventory.xlsx",
    format: "xlsx",
    fileUrl: "https://example.com/inventory.xlsx",
    fileSize: 20480,
    rowCount: 1000,
    columnCount: 8,
    columnNames: ["a", "b", "c", "d", "e", "f", "g", "h"],
    columnTypes: [
      "string",
      "number",
      "string",
      "number",
      "string",
      "number",
      "string",
      "date",
    ],
  },
];

describe("DatasetList", () => {
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no datasets", () => {
    render(<DatasetList datasets={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/no datasets uploaded yet/i)).toBeInTheDocument();
  });

  it("renders list of datasets", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    expect(screen.getByText("sales_data.csv")).toBeInTheDocument();
    expect(screen.getByText("products.json")).toBeInTheDocument();
    expect(screen.getByText("inventory.xlsx")).toBeInTheDocument();
  });

  it("shows format badges for each dataset", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("XLSX")).toBeInTheDocument();
  });

  it("shows row count for each dataset", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    expect(screen.getByText(/500 rows/i)).toBeInTheDocument();
    expect(screen.getByText(/200 rows/i)).toBeInTheDocument();
    expect(screen.getByText(/1,000 rows/i)).toBeInTheDocument();
  });

  it("shows file sizes in human-readable format", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    // 10240 bytes = 10 KB, 5120 = 5 KB, 20480 = 20 KB
    expect(screen.getByText(/10(\.\d+)?\s*KB/i)).toBeInTheDocument();
  });

  it("renders delete buttons for each dataset", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it("shows confirmation dialog on delete click", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);
    const [firstDeleteButton] = screen.getAllByRole("button", {
      name: /delete/i,
    });
    fireEvent.click(firstDeleteButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete/i),
    ).toBeInTheDocument();
  });

  it("calls deleteDataset and onDelete callback on confirm", async () => {
    const { deleteDataset } = require("@/lib/requests/dataset");
    (deleteDataset as jest.Mock).mockResolvedValue({ ok: true, error: null });

    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);

    const [firstDeleteButton] = screen.getAllByRole("button", {
      name: /delete/i,
    });
    fireEvent.click(firstDeleteButton);

    const confirmButton = screen.getByRole("button", { name: /^delete$/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(deleteDataset).toHaveBeenCalledWith(1);
      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });
  });

  it("shows error toast when delete fails", async () => {
    const { deleteDataset } = require("@/lib/requests/dataset");
    const { toast } = require("sonner");
    (deleteDataset as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Delete failed",
    });

    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);

    const [firstDeleteButton] = screen.getAllByRole("button", {
      name: /delete/i,
    });
    fireEvent.click(firstDeleteButton);

    const confirmButton = screen.getByRole("button", { name: /^delete$/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  it("closes dialog on cancel", () => {
    render(<DatasetList datasets={mockDatasets} onDelete={mockOnDelete} />);

    const [firstDeleteButton] = screen.getAllByRole("button", {
      name: /delete/i,
    });
    fireEvent.click(firstDeleteButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
