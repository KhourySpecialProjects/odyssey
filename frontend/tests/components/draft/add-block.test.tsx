import { render, screen, fireEvent } from "@testing-library/react";
import { AddBlock } from "@/components/draft/lesson/add-block";

jest.mock("@/components/draft/metadata/hooks/useOffClick", () => ({
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

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        __component: "droplets.generic",
        content: "",
        _clientId: expect.any(String),
      }),
    );
  });

  it("adds an expandable block when Expandable Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Expandable Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.expandable",
      title: "",
      content: "",
      _clientId: expect.any(String),
    });
  });

  it("adds a video block when Video Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Video Block"));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.video",
      url: "",
      _clientId: expect.any(String),
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
      _clientId: expect.any(String),
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
      _clientId: expect.any(String),
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
      _clientId: expect.any(String),
    });
  });

  it("shows callout options when Callout Block is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Callout Block"));
  });

  it("adds a red warning callout when Warning option is clicked", () => {
    render(<AddBlock add={mockAdd} />);

    fireEvent.click(screen.getByText("Callout Block"));
    fireEvent.click(screen.getByRole("button", { name: /warning/i }));

    expect(mockAdd).toHaveBeenCalledWith({
      __component: "droplets.callout",
      content: expect.any(Array),
      color: "bg-red-300",
      type: "info",
      _clientId: expect.any(String),
    });
  });

  describe("AddBlock", () => {
    const mockAdd = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("opens popover when Add Block button is clicked", () => {
      render(<AddBlock add={mockAdd} />);

      const addButton = screen.getByText("Add Block");
      fireEvent.click(addButton);

      expect(screen.getByText("Text Block")).toBeInTheDocument();
      expect(screen.getByText("Callout Block")).toBeInTheDocument();
    });

    it("adds a callout block with correct properties", () => {
      render(<AddBlock add={mockAdd} />);

      fireEvent.click(screen.getByText("Add Block"));

      fireEvent.click(screen.getByText("Callout Block"));

      fireEvent.click(screen.getByText("Warning"));

      expect(mockAdd).toHaveBeenCalledWith({
        __component: "droplets.callout",
        content: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "" }],
          },
        ],
        color: "bg-red-300",
        type: "info",
        _clientId: expect.any(String),
      });
    });
  });

  describe("AddBlock", () => {
    const mockAdd = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("Callout Block Creation", () => {
      it("should create warning callout block", () => {
        render(<AddBlock add={mockAdd} />);

        fireEvent.click(screen.getByText("Add Block"));
        fireEvent.click(screen.getByText("Callout Block"));
        fireEvent.click(screen.getByText("Warning"));

        expect(mockAdd).toHaveBeenCalledWith({
          __component: "droplets.callout",
          content: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "" }],
            },
          ],
          color: "bg-red-300",
          type: "info",
          _clientId: expect.any(String),
        });
      });

      it("should create each type of callout block with correct colors", () => {
        render(<AddBlock add={mockAdd} />);

        const calloutTypes = [
          { name: "Question", color: "bg-blue-300" },
          { name: "Important", color: "bg-orange-300" },
          { name: "Definition", color: "bg-green-300" },
          { name: "More Information", color: "bg-purple-300" },
          { name: "Caution", color: "bg-amber-300" },
          { name: "Default", color: "bg-sky-50 dark:bg-sky-200" },
        ];

        fireEvent.click(screen.getByText("Add Block"));
        fireEvent.click(screen.getByText("Callout Block"));

        calloutTypes.forEach(({ name, color }) => {
          fireEvent.click(screen.getByText(name));
          expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
              __component: "droplets.callout",
              color,
              type: "info",
              _clientId: expect.any(String),
            }),
          );
        });
      });
    });
  });
});
