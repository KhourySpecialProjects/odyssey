import { render, screen, fireEvent } from "@testing-library/react";
import { SortButton } from "@/components/admin/sort-button";

describe("SortButton", () => {
  it("renders the button with 'Sort by' label", () => {
    render(
      <SortButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>sort options</div>
      </SortButton>,
    );
    expect(screen.getByText("Sort by")).toBeInTheDocument();
  });

  it("opens the popout when clicked", async () => {
    render(
      <SortButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>sort options</div>
      </SortButton>,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(await screen.findByText("sort options")).toBeInTheDocument();
  });

  it("renders the popout title 'Sort by'", async () => {
    render(
      <SortButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>content</div>
      </SortButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    // Both the button label and the popout title say "Sort by"
    const allSortBy = await screen.findAllByText("Sort by");
    expect(allSortBy.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Reset and Apply buttons inside the popout", async () => {
    render(
      <SortButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>options</div>
      </SortButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Reset")).toBeInTheDocument();
    expect(await screen.findByText("Apply")).toBeInTheDocument();
  });

  it("calls onApply and closes popout when Apply is clicked", async () => {
    const onApply = jest.fn();
    render(
      <SortButton onApply={onApply} onReset={jest.fn()}>
        <div>options</div>
      </SortButton>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Apply"));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("options")).not.toBeInTheDocument();
  });

  it("calls onReset and closes popout when Reset is clicked", async () => {
    const onReset = jest.fn();
    render(
      <SortButton onApply={jest.fn()} onReset={onReset}>
        <div>options</div>
      </SortButton>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Reset"));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("options")).not.toBeInTheDocument();
  });

  it("renders injected children inside the popout", async () => {
    render(
      <SortButton onApply={jest.fn()} onReset={jest.fn()}>
        <p data-testid="custom-sort-content">Custom sort options here</p>
      </SortButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByTestId("custom-sort-content"),
    ).toBeInTheDocument();
  });
});
