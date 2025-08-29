import { render, screen, fireEvent, act } from "@testing-library/react";
import { AddLesson } from "@/components/draft/add-lesson";
import { useRouter } from "next/navigation";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("AddLesson", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [],
  };
  const mockOnAddLesson = jest.fn();

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders add lesson button", () => {
    render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);
    expect(screen.getByText("Lessons")).toBeInTheDocument();
  });

  it("shows input field when plus icon is clicked", async () => {
    render(<AddLesson droplet={mockDroplet} onAddLesson={jest.fn()} />);

    const plusIcon = screen.getByRole("button");
    fireEvent.click(plusIcon);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByPlaceholderText("Lesson Name")).toBeInTheDocument();
  });

  jest.mock("@/lib/requests/lesson", () => ({
    addLesson: jest.fn(),
  }));

  jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
  }));

  describe("AddLesson", () => {
    const mockDroplet = {
      id: 1,
      name: "Test Droplet",
      slug: "test-droplet",
      lessons: [],
    };

    const mockRouter = {
      push: jest.fn(),
    };

    const mockOnAddLesson = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it("should handle click and focus input", async () => {
      render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);

      const plusButton = screen.getByRole("button");
      fireEvent.click(plusButton);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const input = screen.getByPlaceholderText("Lesson Name");
      expect(input).toHaveFocus();
    });
  });
});
