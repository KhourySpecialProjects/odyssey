import { render, screen, fireEvent } from "@testing-library/react";
import Error from "@/app/(droplets)/d/[slug]/[lessonSlug]/error";
import { Confetti } from "@/app/(droplets)/d/[slug]/recap/confetti";
import NotFound from "@/app/(droplets)/d/[slug]/not-found";

jest.mock("@/components/droplets/lessons/droplet-lesson-wrapper", () => ({
  DropletLessonWrapper: jest.fn(() => (
    <div>Mock DropletLessonWrapper Component</div>
  )),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletBySlug: jest.fn().mockResolvedValue({
    id: 1,
    slug: "test-droplet",
    droplet_lessons: [],
  }),
}));

describe("Droplet Lesson Pages", () => {
  describe("Error Component", () => {
    const mockError: Error & { digest?: string } = {
      name: "Error",
      message: "Test error",
      stack: undefined,
    };
    const mockReset = jest.fn();

    it("renders error message", () => {
      render(<Error error={mockError} reset={mockReset} />);
      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    });

    it("handles reset button click", () => {
      render(<Error error={mockError} reset={mockReset} />);
      fireEvent.click(screen.getByText("Try again"));
      expect(mockReset).toHaveBeenCalled();
    });

    it("renders home page link", () => {
      render(<Error error={mockError} reset={mockReset} />);
      expect(screen.getByText("Return to Home Page")).toBeInTheDocument();
    });
  });

  describe("Layout Component", () => {
    const mockParams = {
      slug: "test-droplet",
      lessonSlug: "test-lesson",
    };
  });

  describe("Confetti Component", () => {
    it("renders nothing", () => {
      const { container } = render(<Confetti />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Image loading and drawing", () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d")!;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should draw the image and trigger confetti on load", () => {
      const myConfetti = jest.fn();
      const defaults = { foo: "bar" };

      const image = new Image();

      jest.useFakeTimers();

      image.onload = () => {
        if (!ctx) return;

        ctx.drawImage(image, 0, 0);
        const pattern = ctx.createPattern(image, "no-repeat");
        expect(pattern).not.toBeNull();

        myConfetti({
          ...defaults,
          shapes: ["circle"],
          colors: ["#297496"],
          particleCount: 1000,
        });

        setTimeout(() => {
          canvas.remove();
        }, 5000);
      };

      image.onload!(new Event("load"));

      jest.runAllTimers();

      expect(document.body.contains(canvas)).toBe(false);
    });
  });

  describe("NotFound Component", () => {
    it("renders not found message", () => {
      render(<NotFound />);
      expect(screen.getByText("Page Not Found")).toBeInTheDocument();
      expect(
        screen.getByText("The requested lesson does not exist."),
      ).toBeInTheDocument();
    });

    it("renders home page link", () => {
      render(<NotFound />);
      expect(screen.getByText("Return to Home Page")).toBeInTheDocument();
    });
  });

  jest.mock("canvas-confetti", () => ({
    create: jest.fn(() => jest.fn()),
  }));

  describe("Confetti", () => {
    let mockContext: Partial<CanvasRenderingContext2D>;

    beforeEach(() => {
      mockContext = {
        drawImage: jest.fn(),
        createPattern: jest.fn(() => ({}) as CanvasPattern),
      } as unknown as Partial<CanvasRenderingContext2D>;

      HTMLCanvasElement.prototype.getContext = jest
        .fn()
        .mockReturnValue(mockContext as CanvasRenderingContext2D);
      global.Image = class {
        onload: () => void = () => {};
        src: string = "";

        constructor() {
          setTimeout(() => {
            this.onload();
          }, 0);
        }
      } as unknown as typeof Image;
    });

    it("creates and removes canvas element with confetti", () => {
      const { unmount } = render(<Confetti />);

      const canvas = document.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveStyle({
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "999999",
      });

      unmount();
      expect(document.querySelector("canvas")).not.toBeInTheDocument();
    });

    it("loads image and triggers confetti animation", () => {
      jest.useFakeTimers();
      render(<Confetti />);

      const canvas = document.querySelector("canvas");
      expect(canvas).toBeInTheDocument();

      jest.useRealTimers();
    });
  });
});
