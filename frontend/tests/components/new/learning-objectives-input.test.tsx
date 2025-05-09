import { render, screen, fireEvent } from "@testing-library/react";
import { LearningObjectivesInput } from "@/components/new/learning-objectives-input";

describe("LearningObjectivesInput", () => {
  const mockLearningObjectives = ["Learn React", "Master TypeScript"];
  const mockSetLearningObjectives = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with initial learning objectives", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
      />,
    );

    expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
    expect(
      screen.getByText("By completing this Droplet, you should:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Learn React")).toBeInTheDocument();
    expect(screen.getByText("Master TypeScript")).toBeInTheDocument();
  });

  it("shows first time indicator when firstTime prop is true", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
        firstTime={true}
      />,
    );

    const indicator = screen.getByText("*");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("text-red-500");
  });

  it("adds a new learning objective when Enter key is pressed", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
      />,
    );

    const input = screen.getByPlaceholderText("New Learning Objective...");
    fireEvent.change(input, { target: { value: "New Objective" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSetLearningObjectives).toHaveBeenCalledWith([
      ...mockLearningObjectives,
      "New Objective",
    ]);
  });

  it("does not add empty learning objectives", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
      />,
    );

    const input = screen.getByPlaceholderText("New Learning Objective...");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSetLearningObjectives).not.toHaveBeenCalled();
  });

  it("clears input after adding a learning objective", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
      />,
    );

    const input = screen.getByPlaceholderText("New Learning Objective...");
    fireEvent.change(input, { target: { value: "New Objective" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("");
  });

  it("updates a learning objective when edited", () => {
    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={mockSetLearningObjectives}
      />,
    );

    const firstObjective = screen.getByText("Learn React");
    fireEvent.click(firstObjective);

    const input = screen.getByDisplayValue("Learn React");
    fireEvent.change(input, { target: { value: "Updated Objective" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSetLearningObjectives).toHaveBeenCalledWith([
      "Learn React",
      "Master TypeScript",
      "Learn React",
    ]);
  });
});
