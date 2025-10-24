import { render, screen } from "@testing-library/react";
import { DropletRenderer } from "@/components/droplets/droplet-renderer";
import useDebugStore from "@/stores/debug-toggle-store";

jest.mock("@/stores/debug-toggle-store", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("DropletRenderer", () => {
  const mockDroplet = {
    name: "Test Droplet",
    type: "tutorial",
    focusArea: "frontend",
    lessons: [
      {
        blocks: [
          {
            __component: "droplets.video",
            url: "https://test.com",
            content: "",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    (useDebugStore as unknown as jest.Mock).mockReturnValue(false);
  });

  describe("Basic Rendering", () => {
    it("renders droplet information", () => {
      render(<DropletRenderer droplet={mockDroplet} />);

      expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
      expect(screen.getByText(/tutorial/)).toBeInTheDocument();
      expect(screen.getByText(/frontend/)).toBeInTheDocument();
    });

    it("renders viewing message", () => {
      render(<DropletRenderer droplet={mockDroplet} />);

      expect(screen.getByText(/You are viewing the/)).toBeInTheDocument();
      expect(screen.getByText(/Droplet in the/)).toBeInTheDocument();
      expect(screen.getByText(/focus area/)).toBeInTheDocument();
    });

    it("bolds droplet name in message", () => {
      const { container } = render(<DropletRenderer droplet={mockDroplet} />);

      const strong = container.querySelector("strong");
      expect(strong).toHaveTextContent("Test Droplet");
    });
  });

  describe("Video Block", () => {
    it("renders video block correctly", () => {
      render(<DropletRenderer droplet={mockDroplet} />);

      const iframe = screen.getByTitle("Embedded YouTube video");
      expect(iframe).toHaveAttribute("src", "https://test.com");
      expect(iframe).toHaveAttribute("width", "80%");
      expect(iframe).toHaveAttribute("height", "480");
      expect(iframe).toHaveAttribute("allowFullScreen");
    });

    it("video iframe has correct allow attribute", () => {
      render(<DropletRenderer droplet={mockDroplet} />);

      const iframe = screen.getByTitle("Embedded YouTube video");
      expect(iframe).toHaveAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      );
    });

    it("video iframe has correct inline styles", () => {
      render(<DropletRenderer droplet={mockDroplet} />);

      const iframe = screen.getByTitle("Embedded YouTube video");
      expect(iframe).toHaveStyle({ display: "flex", margin: "auto" });
    });
  });

  describe("Multiple Blocks", () => {
    it("renders multiple video blocks", () => {
      const multiBlockDroplet = {
        ...mockDroplet,
        lessons: [
          {
            blocks: [
              {
                __component: "droplets.video",
                url: "https://video1.com",
                content: "",
              },
              {
                __component: "droplets.video",
                url: "https://video2.com",
                content: "",
              },
            ],
          },
        ],
      };

      render(<DropletRenderer droplet={multiBlockDroplet} />);

      const iframes = screen.getAllByTitle("Embedded YouTube video");
      expect(iframes).toHaveLength(2);
      expect(iframes[0]).toHaveAttribute("src", "https://video1.com");
      expect(iframes[1]).toHaveAttribute("src", "https://video2.com");
    });

    it("renders nothing for unknown block types", () => {
      const unknownBlockDroplet = {
        ...mockDroplet,
        lessons: [
          {
            blocks: [
              {
                __component: "droplets.unknown",
                content: "Unknown content",
              } as any,
            ],
          },
        ],
      };

      render(<DropletRenderer droplet={unknownBlockDroplet} />);

      expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
      expect(
        screen.queryByTitle("Embedded YouTube video"),
      ).not.toBeInTheDocument();
    });

    it("renders mix of video and unknown blocks", () => {
      const mixedBlockDroplet = {
        ...mockDroplet,
        lessons: [
          {
            blocks: [
              {
                __component: "droplets.video",
                url: "https://test.com",
                content: "",
              },
              {
                __component: "droplets.generic",
                content: "Generic content",
              } as any,
            ],
          },
        ],
      };

      render(<DropletRenderer droplet={mixedBlockDroplet} />);

      expect(screen.getAllByTitle("Embedded YouTube video")).toHaveLength(1);
    });
  });

  describe("Empty States", () => {
    it("renders with no blocks", () => {
      const noBlocksDroplet = {
        ...mockDroplet,
        lessons: [{ blocks: [] }],
      };

      render(<DropletRenderer droplet={noBlocksDroplet} />);

      expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
      expect(
        screen.queryByTitle("Embedded YouTube video"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct container styling", () => {
      const { container } = render(<DropletRenderer droplet={mockDroplet} />);

      const wrapper = container.querySelector(".mx-auto");
      expect(wrapper).toHaveClass("w-full");
      expect(wrapper).toHaveClass("max-w-prose");
    });

    it("info banner has correct styling", () => {
      const { container } = render(<DropletRenderer droplet={mockDroplet} />);

      const banner = container.querySelector(".bg-slate-50");
      expect(banner).toHaveClass("rounded-md");
      expect(banner).toHaveClass("p-4");
      expect(banner).toHaveClass("text-slate-700");
    });

    it("applies spacer div", () => {
      const { container } = render(<DropletRenderer droplet={mockDroplet} />);

      const spacer = container.querySelector(".h-8");
      expect(spacer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long droplet name", () => {
      const longNameDroplet = {
        ...mockDroplet,
        name: "A".repeat(200),
      };

      render(<DropletRenderer droplet={longNameDroplet} />);

      expect(screen.getByText(new RegExp("A".repeat(50)))).toBeInTheDocument();
    });

    it("handles special characters in droplet name", () => {
      const specialNameDroplet = {
        ...mockDroplet,
        name: "Droplet & <Special> Characters",
      };

      render(<DropletRenderer droplet={specialNameDroplet} />);

      expect(
        screen.getByText(/Droplet & <Special> Characters/),
      ).toBeInTheDocument();
    });

    it("handles different types and focus areas", () => {
      const differentDroplet = {
        ...mockDroplet,
        type: "project",
        focusArea: "backend",
      };

      render(<DropletRenderer droplet={differentDroplet} />);

      expect(screen.getByText(/project/)).toBeInTheDocument();
      expect(screen.getByText(/backend/)).toBeInTheDocument();
    });
  });
});
