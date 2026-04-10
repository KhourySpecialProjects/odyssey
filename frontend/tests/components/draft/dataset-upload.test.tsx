import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatasetUpload } from "@/components/draft/dataset/dataset-upload";
import { Dataset } from "@/types";

// Mock the Server Actions
jest.mock("@/lib/actions", () => ({
  uploadDataset: jest.fn(),
}));

// Mock the request functions
jest.mock("@/lib/requests/dataset", () => ({
  createDataset: jest.fn(),
}));

// Mock the dataset parser
jest.mock("@/lib/dataset-parser", () => ({
  parseDatasetFile: jest.fn(),
}));

// Mock react-dropzone
jest.mock("react-dropzone", () => ({
  useDropzone: jest.fn(({ onDrop, accept, maxSize }) => ({
    getRootProps: () => ({
      onClick: jest.fn(),
      "data-testid": "dropzone",
    }),
    getInputProps: () => ({
      type: "file",
      accept: Object.keys(accept || {}).join(","),
      "data-testid": "file-input",
    }),
    isDragActive: false,
    open: jest.fn(),
    // Expose onDrop for tests to call directly
    _onDrop: onDrop,
    _maxSize: maxSize,
  })),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDatasets: Dataset[] = [];

const mockParsedDataset = {
  rows: [
    ["Alice", "30"],
    ["Bob", "25"],
  ],
  columnNames: ["name", "age"],
  columnTypes: ["string", "number"],
  rowCount: 2,
  columnCount: 2,
  preview: [
    ["Alice", "30"],
    ["Bob", "25"],
  ],
};

describe("DatasetUpload", () => {
  const defaultProps = {
    dropletId: 1,
    datasets: mockDatasets,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the drop zone", () => {
    render(<DatasetUpload {...defaultProps} />);
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  it("shows dataset count badge", () => {
    render(<DatasetUpload {...defaultProps} />);
    expect(screen.getByText(/0 \/ 5 datasets/i)).toBeInTheDocument();
  });

  it("shows correct count when datasets are provided", () => {
    const datasets: Dataset[] = [
      {
        id: 1,
        name: "test.csv",
        fileUrl: "https://example.com/test.csv",
        format: "csv",
        fileSize: 1024,
      },
    ];
    render(<DatasetUpload dropletId={1} datasets={datasets} />);
    expect(screen.getByText(/1 \/ 5 datasets/i)).toBeInTheDocument();
  });

  it("disables upload when at 5 dataset limit", () => {
    const fiveDatasets: Dataset[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `dataset${i + 1}.csv`,
      fileUrl: `https://example.com/dataset${i + 1}.csv`,
      format: "csv",
      fileSize: 1024,
    }));
    render(<DatasetUpload dropletId={1} datasets={fiveDatasets} />);
    expect(
      screen.getByText(/maximum of 5 datasets reached/i),
    ).toBeInTheDocument();
  });

  it("shows preview after file is parsed", async () => {
    const { parseDatasetFile } = require("@/lib/dataset-parser");
    (parseDatasetFile as jest.Mock).mockResolvedValue(mockParsedDataset);

    const { useDropzone } = require("react-dropzone");
    const dropzoneInstance = {
      getRootProps: () => ({ "data-testid": "dropzone" }),
      getInputProps: () => ({ type: "file", "data-testid": "file-input" }),
      isDragActive: false,
      open: jest.fn(),
    };
    let capturedOnDrop: ((files: File[]) => void) | null = null;
    (useDropzone as jest.Mock).mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return dropzoneInstance;
    });

    render(<DatasetUpload {...defaultProps} />);

    const file = new File(["name,age\nAlice,30"], "data.csv", {
      type: "text/csv",
    });

    await act(async () => {
      capturedOnDrop!([file]);
    });

    await waitFor(() => {
      expect(parseDatasetFile).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(screen.getByText("data.csv")).toBeInTheDocument();
    });
  });

  it("shows size error for oversized file", async () => {
    const { useDropzone } = require("react-dropzone");
    let capturedOnDrop: ((files: File[], rejected: unknown[]) => void) | null =
      null;
    (useDropzone as jest.Mock).mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ type: "file", "data-testid": "file-input" }),
        isDragActive: false,
        open: jest.fn(),
      };
    });

    render(<DatasetUpload {...defaultProps} />);

    // Simulate a rejected file due to size
    const rejected = [
      {
        file: new File(["x"], "big.csv", { type: "text/csv" }),
        errors: [{ code: "file-too-large", message: "File is too large" }],
      },
    ];

    await act(async () => {
      capturedOnDrop!([], rejected);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/file is too large|exceeds the 25mb/i),
      ).toBeInTheDocument();
    });
  });

  it("calls uploadDataset and createDataset on confirm", async () => {
    const { parseDatasetFile } = require("@/lib/dataset-parser");
    const { uploadDataset } = require("@/lib/actions");
    const { createDataset } = require("@/lib/requests/dataset");

    (parseDatasetFile as jest.Mock).mockResolvedValue(mockParsedDataset);
    (uploadDataset as jest.Mock).mockResolvedValue({
      ok: true,
      url: "https://example.com/uploaded.csv",
      error: null,
    });
    (createDataset as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        id: 42,
        name: "data.csv",
        fileUrl: "https://example.com/uploaded.csv",
        format: "csv",
        fileSize: 100,
      },
      error: null,
    });

    const { useDropzone } = require("react-dropzone");
    let capturedOnDrop: ((files: File[]) => void) | null = null;
    (useDropzone as jest.Mock).mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ type: "file", "data-testid": "file-input" }),
        isDragActive: false,
        open: jest.fn(),
      };
    });

    render(<DatasetUpload {...defaultProps} />);

    const file = new File(["name,age\nAlice,30"], "data.csv", {
      type: "text/csv",
    });

    await act(async () => {
      capturedOnDrop!([file]);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upload/i }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => {
      expect(uploadDataset).toHaveBeenCalled();
      expect(createDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "csv",
          fileUrl: "https://example.com/uploaded.csv",
        }),
      );
    });
  });

  it("shows error toast when upload fails", async () => {
    const { parseDatasetFile } = require("@/lib/dataset-parser");
    const { uploadDataset } = require("@/lib/actions");
    const { toast } = require("sonner");

    (parseDatasetFile as jest.Mock).mockResolvedValue(mockParsedDataset);
    (uploadDataset as jest.Mock).mockResolvedValue({
      ok: false,
      url: null,
      error: "Upload failed",
    });

    const { useDropzone } = require("react-dropzone");
    let capturedOnDrop: ((files: File[]) => void) | null = null;
    (useDropzone as jest.Mock).mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ type: "file", "data-testid": "file-input" }),
        isDragActive: false,
        open: jest.fn(),
      };
    });

    render(<DatasetUpload {...defaultProps} />);

    const file = new File(["name,age\nAlice,30"], "data.csv", {
      type: "text/csv",
    });

    await act(async () => {
      capturedOnDrop!([file]);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upload/i }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/upload failed/i),
      );
    });
  });

  it("allows canceling a pending upload", async () => {
    const { parseDatasetFile } = require("@/lib/dataset-parser");
    (parseDatasetFile as jest.Mock).mockResolvedValue(mockParsedDataset);

    const { useDropzone } = require("react-dropzone");
    let capturedOnDrop: ((files: File[]) => void) | null = null;
    (useDropzone as jest.Mock).mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ type: "file", "data-testid": "file-input" }),
        isDragActive: false,
        open: jest.fn(),
      };
    });

    render(<DatasetUpload {...defaultProps} />);

    const file = new File(["name,age\nAlice,30"], "data.csv", {
      type: "text/csv",
    });

    await act(async () => {
      capturedOnDrop!([file]);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText("data.csv")).not.toBeInTheDocument();
    });
  });
});
