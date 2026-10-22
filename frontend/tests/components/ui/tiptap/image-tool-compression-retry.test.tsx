import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImageToolButton from "@/components/ui/tiptap/toolbar/tools/image-tool";
import type { Editor } from "@tiptap/react";

// Kept apart from image-tool.test.tsx: the component caches the lazily
// imported compression library at module level, and Jest caches a mocked
// module once it loads, so the failing first load needs a fresh test file.

jest.mock("@/lib/actions", () => ({
  uploadImage: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

// The first attempt to load the lazy compression chunk fails
let mockLoadAttempts = 0;
const mockCompress = jest.fn(async (file: File) => file);
jest.mock("browser-image-compression", () => {
  mockLoadAttempts += 1;
  if (mockLoadAttempts === 1) throw new Error("Loading chunk failed");
  return { __esModule: true, default: mockCompress };
});

describe("ImageToolButton compression loading", () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
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
  } as unknown as Editor;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retries loading the compression library after a failed load", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<ImageToolButton editor={mockEditor} />);
    fireEvent.click(screen.getByTitle("Image"));
    const fileInput = screen.getByLabelText("Upload or Drag File Here");
    const selectFile = (name: string) =>
      fireEvent.change(fileInput, {
        target: { files: [new File(["test"], name, { type: "image/png" })] },
      });

    // The failed load falls back to the original, uncompressed file
    selectFile("first.png");
    await waitFor(() =>
      expect(screen.getByText("first.png")).toBeInTheDocument(),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Error compressing image:",
      expect.any(Error),
    );
    expect(mockCompress).not.toHaveBeenCalled();

    // The failure isn't cached, so the next file loads the library again
    selectFile("second.png");
    await waitFor(() =>
      expect(screen.getByText("second.png")).toBeInTheDocument(),
    );
    expect(mockLoadAttempts).toBe(2);
    expect(mockCompress).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
