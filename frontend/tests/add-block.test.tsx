import { render, screen, fireEvent } from "@testing-library/react";
import { AddBlock } from "@/components/draft/lesson/add-block";

// Mock dependencies
jest.mock("../metadata/hooks/useOffClick", () => ({
  useOffClick: jest.fn(() => ({
    open: true,
    setOpen: jest.fn(),
  })),
}));

jest.mock("@/components/ui/callout-icons", () => ({
  CalloutIcon: ({ color }: { color: string }) => (
    <div data-testid="callout-icon" data-color={color}>
      Icon
    </div>
  ),
}));

describe("AddBlock", () => {
  const mockAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Add Block button", () => {
    render(<AddBlock add={mockAdd} />);

    expect(screen.getByText("Add Block")).toBeInTheDocument();
  });

  it("adds a text block when Text Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Text Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.generic",
      content: "",
    });
  });

  it("adds an expandable block when Expandable Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Expandable Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.expandable",
      title: "",
      content: "",
    });
  });

  it("adds a video block when Video Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Video Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.video",
      url: "https://www.youtube.com/watch?v=_ZCTvmaPgao",
    });
  });

  it("adds a multiple choice quiz block when Multiple Choice Quiz Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Multiple Choice Quiz Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.quiz",
      questions: [
        expect.objectContaining({
          content: "",
          answerOptions: [
            expect.objectContaining({ content: "", isCorrect: true }),
            expect.objectContaining({ content: "", isCorrect: false }),
          ],
        }),
      ],
    });
  });

  it("adds an open-ended quiz block when Open Ended Quiz Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Open Ended Quiz Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [
        expect.objectContaining({
          content: "",
          correctAnswer: "",
        }),
      ],
    });
  });

  it("adds a true/false quiz block when True/False Quiz Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("True/False Quiz Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.quiz",
      questions: [
        expect.objectContaining({
          content: "",
          answerOptions: [
            expect.objectContaining({ content: "True", isCorrect: true }),
            expect.objectContaining({ content: "False", isCorrect: false }),
          ],
        }),
      ],
    });
  });

  it("shows callout options when Callout Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Callout Block"));
  });

  it("adds a red warning callout when Warning option is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Warning"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.callout",
      content: expect.any(Array),
      color: "bg-red-300",
      type: "info",
    });
  });
});
