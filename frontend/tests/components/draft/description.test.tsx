import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { htmlToText } from "@/lib/utils";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";
import { Description } from "@/components/draft/metadata/description";

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  htmlToText: jest.fn((text: string) => text),
}));

jest.mock("@/components/ui/tiptap/droplet-description-input", () => ({
  DropletDescriptionInput: ({
    updateContent,
  }: {
    updateContent: (content: string) => void;
  }) => (
    <div
      role="textbox"
      contentEditable
      onInput={async (e) => {
        await updateContent(e.currentTarget.innerHTML);
      }}
    />
  ),
}));

describe("Description", () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      handleChange: mockHandleChange,
      error: null,
    });
  });

  it("converts HTML to text and updates description", async () => {
    render(<Description dropletId={1} initialContent="Initial content" />);

    const descriptionInput = screen.getByRole("textbox");
    const htmlContent = "<p>New description</p>";

    fireEvent.input(descriptionInput, {
      target: { innerHTML: htmlContent },
      currentTarget: { innerHTML: htmlContent },
    });

    await waitFor(() => {
      expect(htmlToText).toHaveBeenCalledWith(htmlContent);
      expect(mockHandleChange).toHaveBeenCalledWith({
        description: htmlContent,
      });
    });
  });

  it("shows error message when present", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      handleChange: mockHandleChange,
      error: "Error updating description",
    });

    render(<Description dropletId={1} initialContent="Initial content" />);

    expect(screen.getByText("Error updating description")).toBeInTheDocument();
  });

  it("properly converts HTML to text", async () => {
    const htmlContent = "<p>Test <strong>content</strong></p>";
    const plainText = "Test content";

    (htmlToText as jest.Mock).mockReturnValueOnce(plainText);

    render(<Description dropletId={1} initialContent="Initial content" />);

    const descriptionInput = screen.getByRole("textbox");

    fireEvent.input(descriptionInput, {
      target: { innerHTML: htmlContent },
      currentTarget: { innerHTML: htmlContent },
    });

    await waitFor(() => {
      expect(htmlToText).toHaveBeenCalledWith(htmlContent);
      expect(mockHandleChange).toHaveBeenCalledWith({
        description: plainText,
      });
    });
  });
});
