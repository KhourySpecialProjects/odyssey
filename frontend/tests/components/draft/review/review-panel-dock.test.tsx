import { render, screen } from "@testing-library/react";
import { ReviewPanelDock } from "@/components/draft/review/review-panel-dock";

jest.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => true }));

describe("ReviewPanelDock without resize", () => {
  it("stays at 384 px with no handle", () => {
    render(
      <ReviewPanelDock mode="open" onOpen={jest.fn()} onCollapse={jest.fn()}>
        <p>content</p>
      </ReviewPanelDock>,
    );

    const aside = screen.getByRole("complementary", {
      name: "Reviewer Transcript",
    });
    expect(aside.style.getPropertyValue("--panel-w")).toBe("");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });
});
