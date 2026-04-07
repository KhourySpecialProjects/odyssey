import { render, screen, fireEvent } from "@testing-library/react";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

jest.mock("@/components/ui/tiptap/droplet-name-input", () => ({
  DropletNameInput: ({
    updateContent,
  }: {
    updateContent: (content: string) => void;
  }) => (
    <div
      contentEditable
      data-testid="name-input"
      onInput={(e) => updateContent(e.currentTarget.innerHTML)}
    />
  ),
}));

describe("DropletName", () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });
  });

  it("shows error message when present", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: "A droplet with a similar title is in progress or already exists.",
      handleChange: mockHandleChange,
    });

    render(<DropletName startingName="Test Droplet" dropletId={1} />);
    expect(
      screen.getByText(
        "A droplet with a similar title is in progress or already exists.",
      ),
    ).toBeInTheDocument();
  });

  it("sanitizes HTML and updates name correctly", () => {
    render(<DropletName startingName="Initial Name" dropletId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit title" }));

    const input = screen.getByTestId("name-input");
    const htmlContent = "<p>New Name&nbsp;with spaces</p>";

    fireEvent.input(input, {
      target: { innerHTML: htmlContent },
      currentTarget: { innerHTML: htmlContent },
    });

    expect(mockHandleChange).toHaveBeenCalledWith({
      name: "New Name with spaces",
      slug: "new-name-with-spaces",
    });
  });

  it("trims whitespace from name", () => {
    render(<DropletName startingName="Initial Name" dropletId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit title" }));

    const input = screen.getByTestId("name-input");

    fireEvent.input(input, {
      target: { innerHTML: "  Spaces Around  " },
      currentTarget: { innerHTML: "  Spaces Around  " },
    });

    expect(mockHandleChange).toHaveBeenCalledWith({
      name: "Spaces Around",
      slug: "spaces-around",
    });
  });

  it("generates proper slug from name", () => {
    render(<DropletName startingName="Initial Name" dropletId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit title" }));

    const input = screen.getByTestId("name-input");

    fireEvent.input(input, {
      target: { innerHTML: "My Cool Droplet!" },
      currentTarget: { innerHTML: "My Cool Droplet!" },
    });

    expect(mockHandleChange).toHaveBeenCalledWith({
      name: "My Cool Droplet!",
      slug: "my-cool-droplet",
    });
  });
});
