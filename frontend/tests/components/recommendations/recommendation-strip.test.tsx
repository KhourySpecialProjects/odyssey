import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendationStrip } from "@/components/recommendations/recommendation-strip";
import { recommendation } from "@/testing/mocks/recommendations";

const picks = [1, 2, 3, 4].map((id) => recommendation({ id }));

describe("RecommendationStrip", () => {
  it("shows 3 picks under its heading, and passes Refresh and ✕ through", async () => {
    const onRefresh = jest.fn();
    const onDismiss = jest.fn();
    render(
      <RecommendationStrip
        recommendations={picks}
        onRefresh={onRefresh}
        onDismiss={onDismiss}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Recommended for you" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Not interested in Droplet 2" }),
    );
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(2);
  });

  it("shows placeholders and turns Refresh off while loading", () => {
    render(
      <RecommendationStrip
        recommendations={picks}
        isLoading
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByText("Loading recommendations")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  });

  it("is hidden when there is nothing to recommend", () => {
    const { container } = render(
      <RecommendationStrip recommendations={[]} onRefresh={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
