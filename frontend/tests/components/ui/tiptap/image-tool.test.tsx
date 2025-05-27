import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImageToolButton from "@/components/ui/tiptap/toolbar/tools/image-tool";
import { Editor } from "@tiptap/react";
import { uploadImage } from "@/lib/actions";
import imageCompression from "browser-image-compression";

jest.mock("@/lib/actions", () => ({
  uploadImage: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock("browser-image-compression", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("ImageToolButton", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    createParagraphNear: jest.fn().mockReturnThis(),
    run: jest.fn(),
    view: {
      state: {
        selection: {
          $from: {
            node: jest.fn().mockReturnValue({ type: { name: "doc" } }),
          },
        },
      },
    },
  } as unknown as Editor & {
    setImage: (options: { src: string }) => Editor;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openPopover = () => {
    const button = screen.getByTitle("Image");
    fireEvent.click(button);
  };

  describe("insertImage", () => {
    it("should insert image when upload is successful", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      const mockResponse = { ok: true, url: "https://example.com/image.png" };

      (uploadImage as jest.Mock).mockResolvedValueOnce(mockResponse);
      (imageCompression as unknown as jest.Mock).mockResolvedValueOnce(
        mockFile,
      );

      render(<ImageToolButton editor={mockEditor} />);

      openPopover();

      const fileInput = screen.getByLabelText("Upload or Drag File Here");
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockEditor.chain).toHaveBeenCalled();
      });
    });

    it("should not insert image when upload fails", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      const mockResponse = { ok: false, error: "Upload failed" };

      (uploadImage as jest.Mock).mockResolvedValueOnce(mockResponse);
      (imageCompression as unknown as jest.Mock).mockResolvedValueOnce(
        mockFile,
      );

      render(<ImageToolButton editor={mockEditor} />);

      openPopover();

      const fileInput = screen.getByLabelText("Upload or Drag File Here");
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockEditor.setImage).not.toHaveBeenCalled();
      });
    });
  });

  describe("FileUpload", () => {
    it("should handle file change", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      (imageCompression as unknown as jest.Mock).mockResolvedValueOnce(
        mockFile,
      );

      render(<ImageToolButton editor={mockEditor} />);

      openPopover();

      const fileInput = screen.getByLabelText("Upload or Drag File Here");
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText("test.png")).toBeInTheDocument();
      });
    });

    it("should handle file removal", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      (imageCompression as unknown as jest.Mock).mockResolvedValueOnce(
        mockFile,
      );

      render(<ImageToolButton editor={mockEditor} />);

      openPopover();

      const fileInput = screen.getByLabelText("Upload or Drag File Here");
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const removeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(removeButton);

      expect(screen.queryByText("test.png")).not.toBeInTheDocument();
    });

    it("should handle drag and drop", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      (imageCompression as unknown as jest.Mock).mockResolvedValueOnce(
        mockFile,
      );

      render(<ImageToolButton editor={mockEditor} />);

      openPopover();

      const dropZone = screen
        .getByLabelText("Upload or Drag File Here")
        .closest("div");

      fireEvent.dragOver(dropZone!);
      expect(dropZone).toHaveClass("border-blue-500");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText("test.png")).toBeInTheDocument();
      });
    });
  });
});
