import { HighlightDropdown } from "@/components/droplets/lessons/highlight-dropdown";
import { HighlightColor } from "@/types";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("calls color selection handler", () => {
    render(<HighlightDropdown {...mockProps} />);

    const pinkButton = screen.getByTitle("Highlight Pink");
    fireEvent.click(pinkButton);

    expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#f9a8d4");
  });

  it("toggles visibility when hovering over pen icon", async () => {
    render(<HighlightDropdown {...mockProps} />);

    const penIcon = screen.getByTestId("pen");
    await userEvent.hover(penIcon);

    const dropdown = screen.getByRole("button", { name: /highlight yellow/i });
    expect(dropdown).toBeVisible();
  });

  it("handles color selection", async () => {
    render(<HighlightDropdown {...mockProps} />);

    const penIcon = screen.getByTestId("pen");
    await userEvent.hover(penIcon);

    const pinkButton = screen.getByRole("button", { name: /highlight pink/i });
    await userEvent.click(pinkButton);
    expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#f9a8d4");

    const blueButton = screen.getByRole("button", { name: /highlight blue/i });
    await userEvent.click(blueButton);
    expect(mockProps.handleApplyColor).toHaveBeenCalledWith("#93c5fd");
  });
});
