import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddLessonBlock from "@/components/draft/lesson/add-tools";

describe("AddLessonBlock", () => {
  const mockOnAddBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the floating action button in open state by default", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Component starts open, so it shows "Close" button
    const fabButton = screen.getByLabelText("Close");
    expect(fabButton).toBeInTheDocument();
  });

  it("closes the main menu when Close button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    const fabButton = screen.getByLabelText("Close");
    fireEvent.click(fabButton);

    // Check that the button label changes to "Add a block"
    expect(screen.getByLabelText("Add a block")).toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AddLessonBlock onAddBlock={mockOnAddBlock} />
      </div>,
    );

    // Starts open
    expect(screen.getByLabelText("Close")).toBeInTheDocument();

    // Click outside
    const outside = screen.getByTestId("outside");
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      expect(screen.getByLabelText("Add a block")).toBeInTheDocument();
    });
  });

  it("adds a text block when Text button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const textButton = screen.getByLabelText("Text");
    fireEvent.click(textButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("Text");
  });

  it("adds an expandable block when Expandable button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const expandableButton = screen.getByLabelText("Expandable");
    fireEvent.click(expandableButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("Expandable");
  });

  it("adds a video block when Video button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const videoButton = screen.getByLabelText("Video");
    fireEvent.click(videoButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("Video");
  });

  it("adds a multiple choice quiz block when Multiple Choice Quiz button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const mcqButton = screen.getByLabelText("Multiple Choice Quiz");
    fireEvent.click(mcqButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("Multiple Choice Quiz");
  });

  it("adds an open-ended quiz block when Open Ended Quiz button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const openEndedButton = screen.getByLabelText("Open Ended Quiz");
    fireEvent.click(openEndedButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("Open Ended Quiz");
  });

  it("adds a true/false quiz block when True/False Quiz button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const trueFalseButton = screen.getByLabelText("True/False Quiz");
    fireEvent.click(trueFalseButton);

    expect(mockOnAddBlock).toHaveBeenCalledWith("True/False Quiz");
  });

  it("shows callout options when Callout Block button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const calloutButton = screen.getByLabelText("Callout Block");
    fireEvent.click(calloutButton);

    // Check that modal appears with callout options
    expect(screen.getByText("Select Callout Type")).toBeInTheDocument();
  });

  it("navigates back to main menu when back button is clicked", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    // Menu starts open, no need to open it
    const calloutButton = screen.getByLabelText("Callout Block");
    fireEvent.click(calloutButton);

    expect(screen.getByText("Select Callout Type")).toBeInTheDocument();

    const backButton = screen.getByText("Back");
    fireEvent.click(backButton);

    // Should return to main menu with Close button still visible
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  describe("Callout Block Creation", () => {
    it("adds a warning callout block when Warning option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      // Menu starts open
      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const warningButton = screen.getByLabelText("Warning");
      fireEvent.click(warningButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith("Callout Block", "Warning");
    });

    it("adds a question callout block when Question option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const questionButton = screen.getByLabelText("Question");
      fireEvent.click(questionButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith("Callout Block", "Question");
    });

    it("adds an important callout block when Important option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const importantButton = screen.getByLabelText("Important");
      fireEvent.click(importantButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith("Callout Block", "Important");
    });

    it("adds a definition callout block when Definition option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const definitionButton = screen.getByLabelText("Definition");
      fireEvent.click(definitionButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith(
        "Callout Block",
        "Definition",
      );
    });

    it("adds an information callout block when Information option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const informationButton = screen.getByLabelText("Information");
      fireEvent.click(informationButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith(
        "Callout Block",
        "Information",
      );
    });

    it("adds a caution callout block when Caution option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const cautionButton = screen.getByLabelText("Caution");
      fireEvent.click(cautionButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith("Callout Block", "Caution");
    });

    it("adds a default callout block when Default option is clicked", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const defaultButton = screen.getByLabelText("Default");
      fireEvent.click(defaultButton);

      expect(mockOnAddBlock).toHaveBeenCalledWith("Callout Block", "Default");
    });

    it("closes the menu after adding a callout block", () => {
      render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

      const calloutButton = screen.getByLabelText("Callout Block");
      fireEvent.click(calloutButton);

      const warningButton = screen.getByLabelText("Warning");
      fireEvent.click(warningButton);

      // Menu should close and return to closed state
      expect(screen.getByLabelText("Add a block")).toBeInTheDocument();
    });
  });

  it("closes the menu after adding any non-callout block", () => {
    render(<AddLessonBlock onAddBlock={mockOnAddBlock} />);

    const textButton = screen.getByLabelText("Text");
    fireEvent.click(textButton);

    // Menu should close and return to closed state
    expect(screen.getByLabelText("Add a block")).toBeInTheDocument();
  });
});
