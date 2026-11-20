import { within } from "@testing-library/react";

// DialogContent already renders one "Close" button (ODY-874). A second one is
// a duplicate X; icon-only buttons are fine if named (aria-label/labelledby/title).
export const expectSingleCloseButton = (dialog: HTMLElement) => {
  expect(
    within(dialog).getAllByRole("button", { name: /close/i }),
  ).toHaveLength(1);
  const unnamed = within(dialog)
    .getAllByRole("button")
    .filter(
      (button) =>
        !button.textContent?.trim() &&
        !button.getAttribute("aria-label")?.trim() &&
        !button.getAttribute("aria-labelledby") &&
        !button.getAttribute("title")?.trim(),
    );
  expect(unnamed).toHaveLength(0);
};
