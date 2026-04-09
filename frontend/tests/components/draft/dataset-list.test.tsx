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
    fileUrl: "https://example.com/sales.csv",
    format: "csv",
    fileSize: 10240,
  },
  {
    id: 2,
    name: "products.json",
    fileUrl: "https://example.com/products.json",
    format: "json",
    fileSize: 5120,
  },
  {
    id: 3,
    name: "inventory.xlsx",
    fileUrl: "https://example.com/inventory.xlsx",
    format: "xlsx",
    fileSize: 20480,
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
