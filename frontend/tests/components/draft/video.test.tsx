import { render, screen, fireEvent } from "@testing-library/react";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";

jest.mock("@/lib/utils", () => ({
  youtubeUrlToEmbeddedUrl: jest.fn((url) => `embedded-${url}`),
  embeddedUrlToYoutubeUrl: jest.fn((url) => `youtube-${url}`),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("VideoEditor", () => {
  const mockBlock = {
    url: "https://www.youtube.com/embed/test123",
    __component: "droplets.video",
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("toggles edit mode when clicking pencil and check icons", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByTitle("Embedded YouTube video")).toBeInTheDocument();

    const pencilIcon = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(pencilIcon);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.queryByTitle("Embedded YouTube video"),
    ).not.toBeInTheDocument();

    const checkIcon = screen.getByRole("button", { name: /save/i });
    fireEvent.click(checkIcon);

    expect(screen.getByTitle("Embedded YouTube video")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("updates block with new URL when saving", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const pencilIcon = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(pencilIcon);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: "https://www.youtube.com/watch?v=newtest456" },
    });

    const checkIcon = screen.getByRole("button", { name: /save/i });
    fireEvent.click(checkIcon);

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.video",
      url: "embedded-https://www.youtube.com/watch?v=newtest456",
    });
  });

  it("maintains current URL if no changes made", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const pencilIcon = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(pencilIcon);

    const checkIcon = screen.getByRole("button", { name: /save/i });
    fireEvent.click(checkIcon);

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.video",
      url: expect.stringContaining("test123"),
    });
  });

  it("preserves component type when updating", () => {
    render(
      <VideoEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockUpdateBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        __component: "droplets.video",
      }),
    );
  });
});
