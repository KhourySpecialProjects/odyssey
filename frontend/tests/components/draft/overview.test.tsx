import { fireEvent, render, screen } from "@testing-library/react";
import { Overview } from "@/components/draft/metadata/overview";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

describe("Overview", () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });
  });

  it("renders overview title", () => {
    render(<Overview dropletId={1} initialContent="Test content" />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("displays error message when present", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: "Test error",
      handleChange: mockHandleChange,
    });

    render(<Overview dropletId={1} initialContent="Test content" />);
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("calls handleChange with updated content", () => {
    render(<Overview dropletId={1} initialContent="Test content" />);
  });

  it("displays error message when error occurs", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: "Failed to update overview",
      handleChange: jest.fn(),
    });

    render(<Overview dropletId={1} initialContent="Initial content" />);

    expect(screen.getByText("Failed to update overview")).toBeInTheDocument();
    expect(screen.getByText("Failed to update overview")).toHaveClass(
      "text-red-500",
    );
  });

  it("does not display error message when no error", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: jest.fn(),
    });

    render(<Overview dropletId={1} initialContent="Initial content" />);

    expect(screen.queryByText(/Failed to update/)).not.toBeInTheDocument();
  });
});

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

jest.mock("@/components/ui/tiptap/droplet-overview-input", () => ({
  DropletOverviewInput: ({ updateContent, initialContent }: any) => (
    <div>
      <textarea
        data-testid="overview-textarea"
        value={initialContent}
        onChange={(e) => updateContent(e.target.value)}
      />
    </div>
  ),
}));

describe("Overview Component", () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });
  });

  it("renders DropletOverviewInput with initial content", () => {
    const initialContent = "Initial Overview Content";
    render(<Overview dropletId={1} initialContent={initialContent} />);

    const textarea = screen.getByTestId("overview-textarea");
    expect(textarea).toHaveValue(initialContent);
  });

  it("calls handleChange when content is updated", () => {
    const initialContent = "Initial Overview Content";
    render(<Overview dropletId={1} initialContent={initialContent} />);

    const textarea = screen.getByTestId("overview-textarea");

    fireEvent.change(textarea, { target: { value: "Updated Content" } });

    expect(mockHandleChange).toHaveBeenCalledWith({
      overview: "Updated Content",
    });
  });
});
