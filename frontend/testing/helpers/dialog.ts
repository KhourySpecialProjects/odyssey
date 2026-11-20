import { within } from "@testing-library/react";

// DialogContent already renders a "Close" button; a second, icon-only button
// (no text, no accessible name) is the duplicate X from ODY-874.
export const expectSingleCloseButton = (dialog: HTMLElement) => {
  expect(
    within(dialog).getAllByRole("button", { name: /close/i }),
  ).toHaveLength(1);
  const iconOnly = within(dialog)
    .getAllByRole("button")
    .filter((button) => !button.textContent?.trim());
  expect(iconOnly).toHaveLength(0);
};
