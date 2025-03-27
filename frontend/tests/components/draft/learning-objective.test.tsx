import { LearningObjectiveDisplay } from "@/components/draft/metadata/learning-objectives/learning-objective";
import { render, fireEvent, screen } from "@testing-library/react";

describe("LearningObjectiveDisplay", () => {
  const mockUpdate = jest.fn();
  const mockRemove = jest.fn();
  const defaultProps = {
    objective: "Test Objective",
    update: mockUpdate,
    remove: mockRemove,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render objective text when not in edit mode", () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);
    expect(screen.getByText("Test Objective")).toBeInTheDocument();
  });

  it("should switch to edit mode on click", () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);

    fireEvent.click(screen.getByText("Test Objective"));

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Test Objective");
  });

  it("should call update when editing objective", () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);

    fireEvent.click(screen.getByText("Test Objective"));
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "Updated Objective" } });

    expect(mockUpdate).toHaveBeenCalledWith("Updated Objective");
  });

  describe("LearningObjectiveDisplay", () => {
    const mockProps = {
      objective: "Test Objective",
      update: jest.fn(),
      remove: jest.fn(),
    };

    it("applies correct styling based on hover state", () => {
      render(<LearningObjectiveDisplay {...mockProps} />);

      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveClass("hover:shadow", "cursor-pointer");

      fireEvent.click(listItem);
      expect(listItem).toHaveClass("shadow-md");
      expect(listItem).not.toHaveClass("hover:shadow", "cursor-pointer");
    });

    it("toggles edit mode on click", () => {
      render(<LearningObjectiveDisplay {...mockProps} />);

      expect(screen.getByText("Test Objective")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("listitem"));

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("Test Objective");
    });

    const mockUpdate = jest.fn();
    const mockRemove = jest.fn();

    it("prevents opening when already open", () => {
      render(
        <LearningObjectiveDisplay
          objective="Test objective"
          update={mockUpdate}
          remove={mockRemove}
        />,
      );

      fireEvent.click(screen.getByText("Test objective"));

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();

      fireEvent.click(screen.getByRole("listitem"));

      expect(input).toBeInTheDocument();
    });
  });
});
