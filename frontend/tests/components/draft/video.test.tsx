import { render, screen, fireEvent } from "@testing-library/react";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";

jest.mock("@/lib/utils", () => ({
  youtubeUrlToEmbeddedUrl: jest.fn((url) => {
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  }),
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

  describe("Initial Rendering", () => {
    it("renders Video Block title", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      expect(screen.getByText("Video Block")).toBeInTheDocument();
    });

    it("renders drag handle icon", () => {
      const { container } = render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const gripIcon = container.querySelector(".lucide-grip-vertical");
      expect(gripIcon).toBeInTheDocument();
    });

    it("renders delete button", () => {
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

    it("starts in edit mode with input visible", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      expect(screen.getByPlaceholderText("Enter URL here")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("shows current URL in input initially", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText(
        "Enter URL here",
      ) as HTMLInputElement;
      expect(input.value).toBe(mockBlock.url);
    });
  });

  describe("Delete Functionality", () => {
    it("calls deleteBlock when trash icon is clicked", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      fireEvent.click(screen.getByRole("trash"));

      expect(mockDeleteBlock).toHaveBeenCalled();
    });

    it("delete button has correct styling", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const deleteButton = screen.getByRole("trash");
      expect(deleteButton).toHaveClass("text-red-600");
      expect(deleteButton).toHaveClass("cursor-pointer");
    });
  });

  describe("Save and View Mode", () => {
    it("exits edit mode and shows iframe when save is clicked", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(
        screen.queryByPlaceholderText("Enter URL here"),
      ).not.toBeInTheDocument();
      expect(screen.getByTitle("Embedded YouTube video")).toBeInTheDocument();
    });

    it("shows edit button after saving", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("calls updateBlock with converted URL when save is clicked", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText("Enter URL here");
      fireEvent.change(input, {
        target: { value: "https://www.youtube.com/watch?v=abc123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(mockUpdateBlock).toHaveBeenCalledWith({
        __component: "droplets.video",
        url: "https://www.youtube.com/embed/abc123",
      });
    });
  });

  describe("URL Input Handling", () => {
    it("updates URL state when input changes", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText("Enter URL here");
      fireEvent.change(input, {
        target: { value: "https://www.youtube.com/watch?v=newId" },
      });

      expect((input as HTMLInputElement).value).toBe(
        "https://www.youtube.com/watch?v=newId",
      );
    });

    it("defaults to www.youtube.com/ when input is cleared", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText("Enter URL here");
      fireEvent.change(input, { target: { value: "" } });

      expect((input as HTMLInputElement).value).toBe("www.youtube.com/");
    });
  });

  describe("Toggle Between Modes", () => {
    it("can toggle from edit to view and back", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      // Save to exit edit mode
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
      expect(screen.getByTitle("Embedded YouTube video")).toBeInTheDocument();

      // Enter edit mode again
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      expect(screen.getByPlaceholderText("Enter URL here")).toBeInTheDocument();
    });
  });

  describe("Iframe Display", () => {
    it("iframe has correct attributes when in view mode", () => {
      render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      // Exit edit mode first
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      const iframe = screen.getByTitle("Embedded YouTube video");
      expect(iframe).toHaveAttribute("src", mockBlock.url);
      expect(iframe).toHaveAttribute("width", "100%");
      expect(iframe).toHaveAttribute("height", "400");
      expect(iframe).toHaveAttribute("allowFullScreen");
      expect(iframe).toHaveAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      );
    });
  });

  describe("Styling", () => {
    it("applies shadow-md class in edit mode", () => {
      const { container } = render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      // Starts in edit mode
      const blockContainer = container.querySelector(".shadow-md");
      expect(blockContainer).toBeInTheDocument();
    });

    it("removes shadow-md class in view mode", () => {
      const { container } = render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      // Exit edit mode
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      const blockContainer = container.querySelector(".shadow-md");
      expect(blockContainer).not.toBeInTheDocument();
    });

    it("applies correct drag handle styling", () => {
      const { container } = render(
        <VideoEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const dragHandle = container.querySelector(".cursor-grab");
      expect(dragHandle).toHaveClass("z-10");
      expect(dragHandle).toHaveClass("text-slate-400");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty URL", () => {
      const emptyUrlBlock = {
        __component: "droplets.video" as const,
        url: "",
      };

      render(
        <VideoEditor
          block={emptyUrlBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText(
        "Enter URL here",
      ) as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("handles very long URL", () => {
      const longUrl = "https://www.youtube.com/embed/" + "a".repeat(200);
      const longUrlBlock = {
        __component: "droplets.video" as const,
        url: longUrl,
      };

      render(
        <VideoEditor
          block={longUrlBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText(
        "Enter URL here",
      ) as HTMLInputElement;
      expect(input.value).toBe(longUrl);
    });

    it("handles URL with query parameters", () => {
      const urlWithParams =
        "https://www.youtube.com/embed/test?param=value&another=123";
      const paramBlock = {
        __component: "droplets.video" as const,
        url: urlWithParams,
      };

      render(
        <VideoEditor
          block={paramBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText(
        "Enter URL here",
      ) as HTMLInputElement;
      expect(input.value).toBe(urlWithParams);
    });

    it("handles non-YouTube URLs", () => {
      const vimeoUrl = "https://player.vimeo.com/video/123456";
      const vimeoBlock = {
        __component: "droplets.video" as const,
        url: vimeoUrl,
      };

      render(
        <VideoEditor
          block={vimeoBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const input = screen.getByPlaceholderText(
        "Enter URL here",
      ) as HTMLInputElement;
      expect(input.value).toBe(vimeoUrl);
    });
  });
});
