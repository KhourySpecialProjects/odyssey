import { render, screen, fireEvent } from "@testing-library/react";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { embeddedUrlToYoutubeUrl } from "@/lib/utils";

// Mock dependencies
jest.mock("@/lib/utils", () => ({
  youtubeUrlToEmbeddedUrl: jest.fn((url) => `embedded-${url}`),
  embeddedUrlToYoutubeUrl: jest.fn((url) => `youtube-${url}`),
}));

jest.mock("@/components/draft/metadata/hooks/useOffClick", () => ({
  useOffClick: jest.fn(() => ({
    open: false,
    setOpen: jest.fn(),
  })),
}));

describe("VideoEditor", () => {
  const mockBlock = {
    __component: "droplets.video",
    url: "https://www.youtube.com/embed/abc123",
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct block title", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Video Block")).toBeInTheDocument();
  });

  it("renders an iframe with the correct URL", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const iframe = screen.getByTitle("Embedded YouTube video");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", mockBlock.url);
  });

  it("calls embeddedUrlToYoutubeUrl when initializing", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(embeddedUrlToYoutubeUrl).toHaveBeenCalledWith(mockBlock.url);
  });

  it("calls deleteBlock when delete button is clicked", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    expect(mockDeleteBlock).toHaveBeenCalled();
  });
});
