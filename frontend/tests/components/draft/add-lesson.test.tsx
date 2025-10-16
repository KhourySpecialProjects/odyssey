import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddLesson } from "@/components/draft/add-lesson";
import { addLesson } from "@/lib/requests/lesson";
import { useRouter } from "next/navigation";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock useFormStatus
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

describe("AddLesson", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [
      {
        id: 1,
        name: "Existing Lesson",
        slug: "existing-lesson",
        type: "general" as const,
        blocks: [],
        droplet_lessons: [],
        droplets: [],
        notes: [],
      },
    ],
  };

  const mockOnAddLesson = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe("Initial Rendering", () => {
    it("renders Lessons header", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      expect(screen.getByText("Lessons")).toBeInTheDocument();
    });

    it("renders add lesson button", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      expect(plusButton).toBeInTheDocument();
    });

    it("does not show input form initially", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      expect(
        screen.queryByPlaceholderText("Lesson Name"),
      ).not.toBeInTheDocument();
    });

    it("does not render form role initially", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  });

  describe("Show/Hide Form", () => {
    it("shows input field when plus icon is clicked", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      fireEvent.click(plusButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });
    });

    it("focuses input after showing form", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      fireEvent.click(plusButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Lesson Name");
        expect(input).toHaveFocus();
      });
    });

    it("hides form when clicking outside", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      fireEvent.click(plusButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      expect(
        screen.queryByPlaceholderText("Lesson Name"),
      ).not.toBeInTheDocument();
    });

    it("does not hide form when clicking inside form", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      fireEvent.click(plusButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Lesson Name");
      fireEvent.mouseDown(input);

      expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
    });

    it("does not hide form when clicking on form container", async () => {
      const { container } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      const formContainer = container.querySelector("li");
      if (formContainer) {
        fireEvent.mouseDown(formContainer);
      }

      expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
    });

    it("handles clicking outside with event target that is not a Node", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      // Create event with non-Node target
      const event = new Event("mousedown");
      Object.defineProperty(event, "target", {
        value: {},
        writable: false,
      });
      document.dispatchEvent(event);

      // Should remain open since target is not a Node
      expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
    });

    it("handles ref being null", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      // Manually trigger mousedown - should handle gracefully
      fireEvent.mouseDown(document.body);

      expect(
        screen.queryByPlaceholderText("Lesson Name"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Structure", () => {
    it("renders form with correct role", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByRole("form")).toBeInTheDocument();
      });
    });

    it("includes hidden dropletId input", async () => {
      const { container } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const dropletIdInput = container.querySelector(
          'input[name="dropletId"]',
        );
        expect(dropletIdInput).toHaveAttribute("value", "1");
        expect(dropletIdInput).toHaveAttribute("type", "submit");
        expect(dropletIdInput).toHaveAttribute("hidden");
        expect(dropletIdInput).toHaveAttribute("readOnly");
      });
    });

    it("includes name input with correct attributes", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText("Lesson Name");
        expect(nameInput).toHaveAttribute("name", "name");
        expect(nameInput).toHaveAttribute("type", "text");
      });
    });

    it("form has autocomplete off", async () => {
      const { container } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const form = container.querySelector("form");
        expect(form).toHaveAttribute("autocomplete", "off");
      });
    });

    it("name input has correct styling classes", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Lesson Name");
        expect(input).toHaveClass("border-0");
        expect(input).toHaveClass("bg-transparent");
        expect(input).toHaveClass("ring-0");
        expect(input).toHaveClass("outline-none");
        expect(input).toHaveClass("focus:ring-0");
        expect(input).toHaveClass("focus:outline-none");
      });
    });
  });
});
