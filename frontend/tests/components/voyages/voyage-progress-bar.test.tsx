import { render, screen } from "@testing-library/react";
import { VoyageProgressBar } from "@/components/voyages/voyage-progress-bar";

describe("VoyageProgressBar", () => {
  it("renders the completed count and total", () => {
    render(
      <VoyageProgressBar
        completionPercentage={45}
        completedCount={3}
        totalCount={7}
      />,
    );

    expect(screen.getByText("3 of 7 completed")).toBeInTheDocument();
  });

  it("renders the percentage", () => {
    render(
      <VoyageProgressBar
        completionPercentage={45}
        completedCount={3}
        totalCount={7}
      />,
    );

    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("renders the progress bar track", () => {
    const { container } = render(
      <VoyageProgressBar
        completionPercentage={45}
        completedCount={3}
        totalCount={7}
      />,
    );

    // The outer track should have slate-200 background
    const track = container.querySelector(".bg-slate-200");
    expect(track).toBeInTheDocument();
  });

  it("renders the green fill bar with correct width style", () => {
    const { container } = render(
      <VoyageProgressBar
        completionPercentage={45}
        completedCount={3}
        totalCount={7}
      />,
    );

    const fill = container.querySelector(".bg-green-500");
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: "45%" });
  });

  it("renders 0% correctly", () => {
    render(
      <VoyageProgressBar
        completionPercentage={0}
        completedCount={0}
        totalCount={5}
      />,
    );

    expect(screen.getByText("0 of 5 completed")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders 100% correctly", () => {
    const { container } = render(
      <VoyageProgressBar
        completionPercentage={100}
        completedCount={5}
        totalCount={5}
      />,
    );

    expect(screen.getByText("5 of 5 completed")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    const fill = container.querySelector(".bg-green-500");
    expect(fill).toHaveStyle({ width: "100%" });
  });
});
