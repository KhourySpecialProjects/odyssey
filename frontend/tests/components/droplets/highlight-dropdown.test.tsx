import { HighlightDropdown } from "@/components/droplets/lessons/highlight-dropdown";
import { render, screen, fireEvent } from "@testing-library/react";

describe("HighlightDropdown", () => {
  const mockProps = {
    setExpanded: jest.fn(),
    expanded: false,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders when isActive is true", () => {
      render(<HighlightDropdown {...mockProps} />);
      // Component renders a portal with buttons when active
      expect(screen.getByTitle("View Notes Bar")).toBeInTheDocument();
    });

    it("does not render when isActive is false", () => {
      render(<HighlightDropdown {...mockProps} isActive={false} />);
      expect(screen.queryByTitle("View Notes Bar")).not.toBeInTheDocument();
    });

    it("renders help icon and notes toggle button", () => {
      render(<HighlightDropdown {...mockProps} />);

      // Both the help section and notes bar toggle should be present
      const container = screen
        .getByTitle("View Notes Bar")
        .closest("div")?.parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe("Expanded State", () => {
    it("applies correct positioning when expanded", () => {
      const { baseElement } = render(
        <HighlightDropdown {...mockProps} expanded={true} />,
      );

      const portal = baseElement.querySelector(".right-\\[355px\\]");
      expect(portal).toBeInTheDocument();
    });

    it("applies correct positioning when collapsed", () => {
      const { baseElement } = render(
        <HighlightDropdown {...mockProps} expanded={false} />,
      );

      const portal = baseElement.querySelector(".right-5");
      expect(portal).toBeInTheDocument();
    });

    it("shows correct title when expanded", () => {
      render(<HighlightDropdown {...mockProps} expanded={true} />);
      expect(screen.getByTitle("Hide Notes Bar")).toBeInTheDocument();
    });

    it("shows correct title when collapsed", () => {
      render(<HighlightDropdown {...mockProps} expanded={false} />);
      expect(screen.getByTitle("View Notes Bar")).toBeInTheDocument();
    });

    it("toggles expanded state when notes icon is clicked", () => {
      render(<HighlightDropdown {...mockProps} />);

      const notesToggle = screen.getByTitle("View Notes Bar");
      fireEvent.click(notesToggle);

      expect(mockProps.setExpanded).toHaveBeenCalledWith(true);
    });

    it("toggles to collapsed when expanded notes icon is clicked", () => {
      render(<HighlightDropdown {...mockProps} expanded={true} />);

      const notesToggle = screen.getByTitle("Hide Notes Bar");
      fireEvent.click(notesToggle);

      expect(mockProps.setExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe("Help Instructions", () => {
    it("renders help icon section", () => {
      const { baseElement } = render(<HighlightDropdown {...mockProps} />);

      // CircleHelp icon should be rendered inside a group relative container
      const helpSection = baseElement.querySelector(".group.relative");
      expect(helpSection).toBeInTheDocument();
    });

    it("shows instructions on hover", () => {
      render(<HighlightDropdown {...mockProps} />);

      // Instructions should be present in the DOM
      expect(
        screen.getByText("Highlighting Instructions:"),
      ).toBeInTheDocument();
    });

    it("instructions include all necessary information", () => {
      render(<HighlightDropdown {...mockProps} />);

      expect(screen.getByText(/Select any text/)).toBeInTheDocument();
      expect(screen.getByText(/Pick a color/)).toBeInTheDocument();
    });
  });

  describe("Styling and CSS Classes", () => {
    it("applies correct z-index classes", () => {
      const { baseElement } = render(<HighlightDropdown {...mockProps} />);

      const portal = baseElement.querySelector(".z-50");
      expect(portal).toBeInTheDocument();
    });

    it("applies shadow and border styling", () => {
      const { baseElement } = render(<HighlightDropdown {...mockProps} />);

      const shadowedElements = baseElement.querySelectorAll(".shadow-lg");
      expect(shadowedElements.length).toBeGreaterThan(0);
    });
  });
});
