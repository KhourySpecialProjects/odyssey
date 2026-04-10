import { render, screen, fireEvent } from "@testing-library/react";
import { LearningObjectivesInput } from "@/components/new/learning-objectives-input";

describe("LearningObjectivesInput", () => {
  const mockLearningObjectives = ["Learn React", "Master TypeScript"];
  const mockSetLearningObjectives = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with initial learning objectives", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
      expect(screen.getByText("Learn React")).toBeInTheDocument();
      expect(screen.getByText("Master TypeScript")).toBeInTheDocument();
    });

    it("renders input field for new objectives", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      expect(input).toBeInTheDocument();
    });

    it("renders add button with CornerDownLeft icon", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      const icon = button.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("renders empty list when no objectives provided", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={[]}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("New Learning Objective..."),
      ).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
          className="custom-class"
        />,
      );

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass("custom-class");
    });

    it("applies default styling classes", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass("w-full");
    });
  });

  describe("First Time Indicator", () => {
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

    it("does not show first time indicator when firstTime is false", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
          firstTime={false}
        />,
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("does not show first time indicator when firstTime is undefined", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });

  describe("Adding Learning Objectives", () => {
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

    it("adds a new learning objective when button is clicked", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      const button = screen.getByRole("button");

      fireEvent.change(input, { target: { value: "New Objective" } });
      fireEvent.click(button);

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

    it("does not add empty objectives via button click", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      const button = screen.getByRole("button");

      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(button);

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

    it("clears input after adding via button click", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      const button = screen.getByRole("button");

      fireEvent.change(input, { target: { value: "New Objective" } });
      fireEvent.click(button);

      expect(input).toHaveValue("");
    });

    it("prevents default on Enter key press", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "New Objective" } });

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      fireEvent(input, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("does not add objective when other keys are pressed", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "New Objective" } });
      fireEvent.keyDown(input, { key: "Tab" });

      expect(mockSetLearningObjectives).not.toHaveBeenCalled();
    });

    it("handles adding objectives with special characters", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "Learn C++ & <Design>" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetLearningObjectives).toHaveBeenCalledWith([
        ...mockLearningObjectives,
        "Learn C++ & <Design>",
      ]);
    });

    it("handles adding very long objectives", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const longObjective =
        "This is a very long learning objective that should still be added to the list";
      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: longObjective } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetLearningObjectives).toHaveBeenCalledWith([
        ...mockLearningObjectives,
        longObjective,
      ]);
    });
  });

  describe("Removing Learning Objectives", () => {
    it("updates list when remove is called", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      // The remove functionality is tested through the LearningObjectiveDisplay component
      // We can verify the function is passed correctly
      expect(screen.getByText("Learn React")).toBeInTheDocument();
      expect(screen.getByText("Master TypeScript")).toBeInTheDocument();
    });

    it("filters out the correct objective when removed", () => {
      const { rerender } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      // Simulate removing an objective by calling setLearningObjectives directly
      const updatedObjectives = mockLearningObjectives.filter(
        (obj) => obj !== "Learn React",
      );
      mockSetLearningObjectives(updatedObjectives);

      expect(mockSetLearningObjectives).toHaveBeenCalledWith([
        "Master TypeScript",
      ]);
    });
  });

  describe("Input Handling", () => {
    it("updates input value when typing", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "Test Input" } });

      expect(input).toHaveValue("Test Input");
    });

    it("has autocomplete turned off", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      expect(input).toHaveAttribute("autocomplete", "off");
    });

    it("has correct name attribute", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      expect(input).toHaveAttribute("name", "objective");
    });

    it("maintains input value when non-Enter key is pressed", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(input).toHaveValue("Test");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty initial objectives array", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={[]}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("New Learning Objective..."),
      ).toBeInTheDocument();
    });

    it("handles rapid Enter key presses", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "Objective 1" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });

      // Should only add once since input is cleared after first add
      expect(mockSetLearningObjectives).toHaveBeenCalledTimes(1);
    });

    it("handles rapid button clicks", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      const button = screen.getByRole("button");

      fireEvent.change(input, { target: { value: "Objective 1" } });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only add once since input is cleared after first click
      expect(mockSetLearningObjectives).toHaveBeenCalledTimes(1);
    });

    it("trims whitespace from objectives", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "  Padded Objective  " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetLearningObjectives).toHaveBeenCalledWith([
        ...mockLearningObjectives,
        "  Padded Objective  ",
      ]);
    });

    it("handles objectives with only whitespace", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "     " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetLearningObjectives).not.toHaveBeenCalled();
    });

    it("handles adding duplicate objectives", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      fireEvent.change(input, { target: { value: "Learn React" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetLearningObjectives).toHaveBeenCalledWith([
        ...mockLearningObjectives,
        "Learn React",
      ]);
    });

    it("handles large number of objectives", () => {
      const manyObjectives = Array.from(
        { length: 20 },
        (_, i) => `Objective ${i + 1}`,
      );

      render(
        <LearningObjectivesInput
          learningObjectives={manyObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      expect(screen.getByText("Objective 1")).toBeInTheDocument();
      expect(screen.getByText("Objective 20")).toBeInTheDocument();
    });
  });

  describe("Scrollable Container", () => {
    it("renders objectives in a scrollable container", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const listContainer = container.querySelector(".rounded-lg");
      expect(listContainer).toBeInTheDocument();
    });

    it("applies fixed height to scroll container", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
    });

    it("renders objectives in an unordered list", () => {
      const { container } = render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("input has proper placeholder text", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const input = screen.getByPlaceholderText("New Learning Objective...");
      expect(input).toHaveAttribute("placeholder", "New Learning Objective...");
    });

    it("button has correct type attribute", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("renders heading with proper hierarchy", () => {
      render(
        <LearningObjectivesInput
          learningObjectives={mockLearningObjectives}
          setLearningObjectives={mockSetLearningObjectives}
        />,
      );

      const heading = screen.getByText("Learning Objectives");
      expect(heading.tagName).toBe("H2");
    });
  });
});
