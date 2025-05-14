import { render, screen, fireEvent } from "@testing-library/react";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";

jest.mock("@/lib/utils", () => ({
  youtubeUrlToEmbeddedUrl: jest.fn((url) => `embedded-${url}`),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("VideoEditor", () => {
  const mockBlock = {
    __component: "droplets.video" as const,
    url: "https://www.youtube.com/embed/test123",
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct initial state", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Video Block")).toBeInTheDocument();
  });

  it("calls deleteBlock when trash icon is clicked", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const deleteButton = screen.getByRole("trash");
    fireEvent.click(deleteButton);

    expect(mockDeleteBlock).toHaveBeenCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Video Editor UI", () => {
    it("renders delete button with correct role", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const deleteButton = screen.getByRole("trash");
      expect(deleteButton).toBeInTheDocument();
    });

    it("calls deleteBlock when delete button is clicked", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const deleteButton = screen.getByRole("trash");
      fireEvent.click(deleteButton);

      expect(mockDeleteBlock).toHaveBeenCalled();
    });
  });
});
