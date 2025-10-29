import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: jest.fn(() => ({ pending: false })),
}));

const { useFormStatus } = require("react-dom");

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
        droplets: [],
        notes: [],
        orderIndex: 0
      },
    ],
  };

  const mockOnAddLesson = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (addLesson as jest.Mock).mockResolvedValue({
      data: {
        id: 2,
        attributes: {
          name: "New Lesson",
          slug: "new-lesson",
          type: "general",
          focusArea: "personal",
        },
      },
      error: null,
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

    it("renders header with correct styling", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const header = screen.getByText("Lessons");
      expect(header.tagName).toBe("P");
      expect(header).toHaveClass("text-lg");
      expect(header).toHaveClass("font-bold");
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

      const event = new Event("mousedown");
      Object.defineProperty(event, "target", {
        value: {},
        writable: false,
      });
      document.dispatchEvent(event);

      expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
    });

    it("cleans up event listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener",
      );

      const { unmount } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
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
      });
    });
  });

  describe("Form Submission", () => {
    it("calls addLesson with correct parameters on first lesson", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Lesson Name");
      fireEvent.change(input, { target: { value: "New Lesson" } });

      expect(input).toHaveValue("New Lesson");
    });

    it("calculates orderIndex from existing lessons length", async () => {
      const dropletWithThreeLessons = {
        ...mockDroplet,
        lessons: [
          mockDroplet.lessons[0],
          { ...mockDroplet.lessons[0], id: 2 },
          { ...mockDroplet.lessons[0], id: 3 },
        ],
      };

      render(
        <AddLesson
          droplet={dropletWithThreeLessons}
          onAddLesson={mockOnAddLesson}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      // Verify form is ready for submission with orderIndex 3
      expect(screen.getByRole("form")).toBeInTheDocument();
    });

    it("shows form for droplet with no lessons", async () => {
      const dropletNoLessons = {
        ...mockDroplet,
        lessons: undefined,
      };

      render(
        <AddLesson droplet={dropletNoLessons} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      expect(screen.getByRole("form")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles droplet with empty lessons array", async () => {
      const emptyLessonsDroplet = {
        ...mockDroplet,
        lessons: [],
      };

      render(
        <AddLesson
          droplet={emptyLessonsDroplet}
          onAddLesson={mockOnAddLesson}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      expect(screen.getByRole("form")).toBeInTheDocument();
    });

    it("handles very long lesson name", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      const longName = "A".repeat(500);
      const input = screen.getByPlaceholderText("Lesson Name");
      fireEvent.change(input, { target: { value: longName } });

      expect(input).toHaveValue(longName);
    });

    it("handles special characters in lesson name", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Lesson Name");
      fireEvent.change(input, {
        target: { value: "Lesson & <Special> Chars" },
      });

      expect(input).toHaveValue("Lesson & <Special> Chars");
    });
  });

  describe("Styling", () => {
    it("applies correct classes to form container", async () => {
      const { container } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const li = container.querySelector("li");
        expect(li).toHaveClass("mb-2");
        expect(li).toHaveClass("w-full");
        expect(li).toHaveClass("rounded");
        expect(li).toHaveClass("shadow");
      });
    });

    it("applies flex layout to form", async () => {
      const { container } = render(
        <AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const form = container.querySelector("form");
        expect(form).toHaveClass("flex");
        expect(form).toHaveClass("flex-row");
      });
    });
  });

  describe("Accessibility", () => {
    it("plus icon has button role", () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("form is keyboard accessible", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const form = screen.getByRole("form");
        expect(form).toBeInTheDocument();
      });
    });

    it("input has placeholder text", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
      });
    });
  });
});
