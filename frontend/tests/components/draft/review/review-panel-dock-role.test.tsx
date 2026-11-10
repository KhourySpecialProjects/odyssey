/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ReviewPanelDock } from "@/components/draft/review/review-panel-dock";

const setWidth = (width: number) => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: width >= 1280 && query === "(min-width: 1280px)",
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
};

const dock = (
  <ReviewPanelDock mode="open" onOpen={jest.fn()} onCollapse={jest.fn()}>
    <p>content</p>
  </ReviewPanelDock>
);

describe("ReviewPanelDock dialog role", () => {
  it("the first render at 1500px has no dialog role", () => {
    setWidth(1500);
    expect(renderToString(dock)).not.toContain('role="dialog"');
  });

  it("is not a dialog at 1500px after effects run", () => {
    setWidth(1500);
    render(dock);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is still a modal dialog below 1280px", () => {
    setWidth(1000);
    render(dock);
    expect(
      screen.getByRole("dialog", { name: "Reviewer Transcript" }),
    ).toHaveAttribute("aria-modal", "true");
  });
});
