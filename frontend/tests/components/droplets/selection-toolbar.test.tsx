import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectionToolbar } from "@/components/droplets/lessons/selection-toolbar";

describe("SelectionToolbar", () => {
  const props = {
    position: { x: 100, y: 100 },
    selectedColor: "#fff300" as const,
    isOnHighlight: true,
    onApplyColor: jest.fn(),
    onDelete: jest.fn(),
    onNote: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs each action from the keyboard (Enter and Space)", async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar {...props} />);

    screen.getByRole("button", { name: "Highlight Green" }).focus();
    await user.keyboard("{Enter}");
    expect(props.onApplyColor).toHaveBeenCalledWith("#86efac");

    screen.getByRole("button", { name: "Add note" }).focus();
    await user.keyboard(" ");
    expect(props.onNote).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "Remove highlight" }).focus();
    await user.keyboard("{Enter}");
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("runs an action once per mouse click", async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar {...props} />);

    await user.click(screen.getByRole("button", { name: "Highlight Pink" }));

    expect(props.onApplyColor).toHaveBeenCalledTimes(1);
    expect(props.onApplyColor).toHaveBeenCalledWith("#f9a8d4");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("keeps the text selection when a button is pressed with the mouse", () => {
    render(<SelectionToolbar {...props} />);

    // Default mousedown would move focus and clear the selected text
    const event = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    screen.getByRole("button", { name: "Add note" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
