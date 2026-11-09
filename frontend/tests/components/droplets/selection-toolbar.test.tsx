import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectionToolbar } from "@/components/droplets/lessons/selection-toolbar";
import { HIGHLIGHT_COLORS } from "@/lib/highlight-colors";

const COLOURS = HIGHLIGHT_COLORS.map(({ label }) => `Highlight ${label}`);
const onExplain = jest.fn();

const renderToolbar = (
  props: Partial<ComponentProps<typeof SelectionToolbar>> = {},
) =>
  render(
    <SelectionToolbar
      anchor={{ top: 100, bottom: 120, centerX: 50 }}
      selectedColor={HIGHLIGHT_COLORS[0].color}
      isOnHighlight={false}
      onApplyColor={jest.fn()}
      onDelete={jest.fn()}
      onNote={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );

const labels = () =>
  screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));

describe("SelectionToolbar (ODY-889)", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["no Mentor", {}, ["Add note"]],
    ["Mentor", { onExplain }, ["Add note", "Explain with Mentor"]],
    [
      "Mentor, on a highlight",
      { onExplain, isOnHighlight: true },
      ["Add note", "Explain with Mentor", "Remove highlight"],
    ],
    [
      "a highlight, no Mentor",
      { isOnHighlight: true },
      ["Add note", "Remove highlight"],
    ],
  ])(
    "with %s, one tab stop and the arrow keys go through every button in order",
    async (_name, props, after) => {
      renderToolbar(props);
      const order = [...COLOURS, ...after];
      expect(labels()).toEqual(order);
      expect(
        screen.getAllByRole("button").filter((b) => b.tabIndex === 0),
      ).toHaveLength(1);

      await userEvent.tab();
      for (const name of [...order.slice(1), order[0]]) {
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name })).toHaveFocus();
      }
      await userEvent.keyboard("{End}");
      expect(screen.getByRole("button", { name: order.at(-1) })).toHaveFocus();
    },
  );

  it("Explain asks Mentor without clearing the selected text", async () => {
    renderToolbar({ onExplain });
    const explain = screen.getByRole("button", { name: "Explain with Mentor" });

    // Default prevented: a mouse down would otherwise drop the selection
    expect(fireEvent.mouseDown(explain)).toBe(false);
    await userEvent.click(explain);
    expect(onExplain).toHaveBeenCalledTimes(1);
  });
});
