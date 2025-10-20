import { HighlightDropdown } from "@/components/droplets/lessons/highlight-dropdown";
import { HighlightColor } from "@/types";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("HighlightDropdown", () => {
  const mockProps = {
    selectedColor: "#fff300" as HighlightColor,
    handleApplyColor: jest.fn(),
    isHighlighting: false,
    setIsHighlighting: jest.fn(),
    handlePopupHighlight: jest.fn(),
    handlePopupDelete: jest.fn(),
    handleCreateNote: jest.fn(),
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
      expect(screen.getByTestId("pen")).toBeInTheDocument();
    });

    it("does not render when isActive is false", () => {
      render(<HighlightDropdown {...mockProps} isActive={false} />);
      expect(screen.queryByTestId("pen")).not.toBeInTheDocument();
    });

    it("renders all main icons", () => {
      render(<HighlightDropdown {...mockProps} />);

      expect(screen.getByTestId("pen")).toBeInTheDocument();
      // Help icon and notes icon should be present
      const container = screen.getByTestId("pen").closest("div")?.parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe("Expanded State", () => {
    it("applies correct positioning when expanded", () => {
      const { container } = render(
        <HighlightDropdown {...mockProps} expanded={true} />,
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass("right-[355px]");
    });

    it("applies correct positioning when collapsed", () => {
      const { container } = render(
        <HighlightDropdown {...mockProps} expanded={false} />,
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass("right-5");
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
      const { container } = render(<HighlightDropdown {...mockProps} />);

      // Find the SVG with the cursor-pointer class (NotepadText icon)
      const notesIcon = container.querySelector(".lucide-notepad-text");
      expect(notesIcon).toBeInTheDocument();

      fireEvent.click(notesIcon!);

      expect(mockProps.setExpanded).toHaveBeenCalledWith(true);
    });

    it("toggles to collapsed when expanded notes icon is clicked", () => {
      const { container } = render(
        <HighlightDropdown {...mockProps} expanded={true} />,
      );

      // Find the SVG with the cursor-pointer class (NotepadText icon)
      const notesIcon = container.querySelector(".lucide-notepad-text");
      expect(notesIcon).toBeInTheDocument();

      fireEvent.click(notesIcon!);

      expect(mockProps.setExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe("Dropdown Visibility", () => {
    it("dropdown is hidden by default", () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      const dropdown = container.querySelector(".hidden");
      expect(dropdown).toBeInTheDocument();
    });

    it("shows dropdown when hovering over pen icon", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const dropdown = screen.getByTitle("Highlight Yellow");
      expect(dropdown).toBeVisible();
    });

    it("hides dropdown when mouse leaves the container", async () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      // Verify dropdown is visible
      expect(screen.getByTitle("Highlight Yellow")).toBeVisible();

      // Mouse leave the parent container
      const parentContainer = penIcon.closest(".group")!;
      fireEvent.mouseLeave(parentContainer);

      // Check that hidden class is applied
      await waitFor(() => {
        const dropdown = container.querySelector(".hidden");
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("toggles visibility with mouseEnter", () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const dropdown = screen.getByTitle("Highlight Yellow");
      expect(dropdown).toBeVisible();
    });
  });

  describe("Color Selection", () => {
    it("calls handleApplyColor with pink color", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const pinkButton = screen.getByTitle("Highlight Pink");
      fireEvent.click(pinkButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#f9a8d4");
    });

    it("calls handleApplyColor with orange color", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const orangeButton = screen.getByTitle("Highlight Orange");
      fireEvent.click(orangeButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#fbd38d");
    });

    it("calls handleApplyColor with yellow color", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const yellowButton = screen.getByTitle("Highlight Yellow");
      fireEvent.click(yellowButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#fff300");
    });

    it("calls handleApplyColor with green color", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const greenButton = screen.getByTitle("Highlight Green");
      fireEvent.click(greenButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#86efac");
    });

    it("calls handleApplyColor with blue color", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const blueButton = screen.getByTitle("Highlight Blue");
      fireEvent.click(blueButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#93c5fd");
    });

    it("handles multiple color selections", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const pinkButton = screen.getByTitle("Highlight Pink");
      await userEvent.click(pinkButton);
      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#f9a8d4");

      const blueButton = screen.getByTitle("Highlight Blue");
      await userEvent.click(blueButton);
      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#93c5fd");

      expect(mockProps.handleApplyColor).toHaveBeenCalledTimes(2);
    });

    it("shows selected color with border styling", () => {
      render(<HighlightDropdown {...mockProps} selectedColor="#f9a8d4" />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const pinkButton = screen.getByTitle("Highlight Pink");
      expect(pinkButton).toHaveClass("border-2", "border-black");
    });

    it("shows non-selected colors with different border styling", () => {
      render(<HighlightDropdown {...mockProps} selectedColor="#f9a8d4" />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const yellowButton = screen.getByTitle("Highlight Yellow");
      expect(yellowButton).toHaveClass("border", "border-gray-300");
      expect(yellowButton).not.toHaveClass("border-2");
    });
  });

  describe("Highlighting Mode Toggle", () => {
    it("renders highlighting mode toggle", () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const toggle = screen.getByTitle("Highlighting Mode");
      expect(toggle).toBeInTheDocument();
    });

    it("toggle is unchecked when isHighlighting is false", () => {
      render(<HighlightDropdown {...mockProps} isHighlighting={false} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const toggle = screen.getByRole("checkbox");
      expect(toggle).not.toBeChecked();
    });

    it("toggle is checked when isHighlighting is true", () => {
      render(<HighlightDropdown {...mockProps} isHighlighting={true} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const toggle = screen.getByRole("checkbox");
      expect(toggle).toBeChecked();
    });

    it("calls setIsHighlighting when toggle is clicked", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const toggle = screen.getByRole("checkbox");
      await userEvent.click(toggle);

      expect(mockProps.setIsHighlighting).toHaveBeenCalled();
    });
  });

  describe("Action Buttons", () => {
    it("renders delete highlight button", () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const deleteButton = screen.getByTitle("Delete Highlight");
      expect(deleteButton).toBeInTheDocument();
    });

    it("calls handlePopupDelete when delete button is clicked", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const deleteButton = screen.getByTitle("Delete Highlight");
      await userEvent.click(deleteButton);

      expect(mockProps.handlePopupDelete).toHaveBeenCalled();
    });

    it("renders take note button", () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      const noteButton = screen.getByTitle("Take Note");
      expect(noteButton).toBeInTheDocument();
    });

    it("calls handleCreateNote when note button is clicked", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      const noteButton = screen.getByTitle("Take Note");
      await userEvent.click(noteButton);

      expect(mockProps.handleCreateNote).toHaveBeenCalled();
    });

    it("calls handlePopupHighlight when pen icon is clicked", () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.click(penIcon);

      expect(mockProps.handlePopupHighlight).toHaveBeenCalled();
    });
  });

  describe("Help Instructions", () => {
    it("renders help icon", () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      // CircleHelp icon should be rendered
      const helpSection = container.querySelector(".group.relative");
      expect(helpSection).toBeInTheDocument();
    });

    it("shows instructions on hover", () => {
      render(<HighlightDropdown {...mockProps} />);

      // Instructions should be present in the DOM (even if hidden)
      expect(
        screen.getByText("Highlighting Instructions:"),
      ).toBeInTheDocument();
    });

    it("instructions include all necessary information", () => {
      render(<HighlightDropdown {...mockProps} />);

      expect(screen.getByText(/Hover over the/)).toBeInTheDocument();
      // "Press the" appears multiple times, so we use getAllByText
      const pressTheTexts = screen.getAllByText(/Press the/);
      expect(pressTheTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/Use the toggle/)).toBeInTheDocument();
      expect(screen.getByText(/In highlighting mode/)).toBeInTheDocument();
      expect(screen.getByText(/Click a colored circle/)).toBeInTheDocument();
    });
  });

  describe("Styling and CSS Classes", () => {
    it("applies correct dark mode classes", () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      const elements = container.querySelectorAll(".dark\\:bg-slate-700");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("applies correct z-index classes", () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass("z-20");
    });

    it("applies shadow and border styling", () => {
      const { container } = render(<HighlightDropdown {...mockProps} />);

      const borderedElements = container.querySelectorAll(".border-black");
      expect(borderedElements.length).toBeGreaterThan(0);

      const shadowedElements = container.querySelectorAll(".shadow-lg");
      expect(shadowedElements.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    it("handles complete workflow: hover, select color, and delete", async () => {
      render(<HighlightDropdown {...mockProps} />);

      // Hover to show dropdown
      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      // Select a color
      const pinkButton = screen.getByTitle("Highlight Pink");
      await userEvent.click(pinkButton);
      expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#f9a8d4");

      // Click delete
      const deleteButton = screen.getByTitle("Delete Highlight");
      await userEvent.click(deleteButton);
      expect(mockProps.handlePopupDelete).toHaveBeenCalled();
    });

    it("handles workflow: toggle highlighting mode and create note", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      // Toggle highlighting mode - use checkbox instead of switch
      const toggle = screen.getByRole("checkbox");
      await userEvent.click(toggle);
      expect(mockProps.setIsHighlighting).toHaveBeenCalled();

      // Create note
      const noteButton = screen.getByTitle("Take Note");
      await userEvent.click(noteButton);
      expect(mockProps.handleCreateNote).toHaveBeenCalled();
    });

    it("handles rapid interactions", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      // Rapidly click multiple colors
      const pinkButton = screen.getByTitle("Highlight Pink");
      const orangeButton = screen.getByTitle("Highlight Orange");
      const yellowButton = screen.getByTitle("Highlight Yellow");

      await userEvent.click(pinkButton);
      await userEvent.click(orangeButton);
      await userEvent.click(yellowButton);

      expect(mockProps.handleApplyColor).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases", () => {
    it("handles clicking pen icon when dropdown is visible", async () => {
      render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      await userEvent.hover(penIcon);

      // Click pen icon while dropdown is visible
      fireEvent.click(penIcon);
      expect(mockProps.handlePopupHighlight).toHaveBeenCalled();
    });

    it("handles all color options with different selectedColor values", () => {
      const colors: HighlightColor[] = [
        "#f9a8d4",
        "#fbd38d",
        "#fff300",
        "#86efac",
        "#93c5fd",
      ];

      colors.forEach((color) => {
        const { unmount } = render(
          <HighlightDropdown {...mockProps} selectedColor={color} />,
        );

        const penIcon = screen.getByTestId("pen");
        fireEvent.mouseEnter(penIcon);

        const selectedButton = screen.getByTitle(
          `Highlight ${
            color === "#f9a8d4"
              ? "Pink"
              : color === "#fbd38d"
                ? "Orange"
                : color === "#fff300"
                  ? "Yellow"
                  : color === "#86efac"
                    ? "Green"
                    : "Blue"
          }`,
        );

        expect(selectedButton).toHaveClass("border-2", "border-black");
        unmount();
      });
    });

    it("maintains state when re-rendering with different props", () => {
      const { rerender } = render(<HighlightDropdown {...mockProps} />);

      const penIcon = screen.getByTestId("pen");
      fireEvent.mouseEnter(penIcon);

      rerender(<HighlightDropdown {...mockProps} isHighlighting={true} />);

      const toggle = screen.getByRole("checkbox");
      expect(toggle).toBeChecked();
    });
  });
});
