import { render, screen, fireEvent } from "@testing-library/react";
import { FilterButton } from "@/components/admin/filter-button";

describe("FilterButton", () => {
  it("renders the button with 'Filter' label", () => {
    render(
      <FilterButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>filter options</div>
      </FilterButton>,
    );
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("opens the popout when clicked", async () => {
    render(
      <FilterButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>filter options</div>
      </FilterButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("filter options")).toBeInTheDocument();
  });

  it("renders Reset and Apply buttons inside the popout", async () => {
    render(
      <FilterButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>options</div>
      </FilterButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Reset")).toBeInTheDocument();
    expect(await screen.findByText("Apply")).toBeInTheDocument();
  });

  it("calls onApply and closes popout when Apply is clicked", async () => {
    const onApply = jest.fn();
    render(
      <FilterButton onApply={onApply} onReset={jest.fn()}>
        <div>options</div>
      </FilterButton>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Apply"));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("options")).not.toBeInTheDocument();
  });

  it("calls onReset and closes popout when Reset is clicked", async () => {
    const onReset = jest.fn();
    render(
      <FilterButton onApply={jest.fn()} onReset={onReset}>
        <div>options</div>
      </FilterButton>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Reset"));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("options")).not.toBeInTheDocument();
  });

  it("renders injected children inside the popout", async () => {
    render(
      <FilterButton onApply={jest.fn()} onReset={jest.fn()}>
        <p data-testid="custom-filter-content">Role checkboxes here</p>
      </FilterButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByTestId("custom-filter-content"),
    ).toBeInTheDocument();
  });

  it("shows active styling when hasActiveFilters is true", () => {
    const { container } = render(
      <FilterButton
        onApply={jest.fn()}
        onReset={jest.fn()}
        hasActiveFilters={true}
      >
        <div>options</div>
      </FilterButton>,
    );

    const button = container.querySelector("button");
    // The teal border class is applied when active
    expect(button?.className).toContain("border-[#2D7597]");
  });

  it("shows active styling when property1 is 'Active State'", () => {
    const { container } = render(
      <FilterButton
        onApply={jest.fn()}
        onReset={jest.fn()}
        property1="Active State"
      >
        <div>options</div>
      </FilterButton>,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("border-[#2D7597]");
  });

  it("shows default styling when no filters are active and popout is closed", () => {
    const { container } = render(
      <FilterButton onApply={jest.fn()} onReset={jest.fn()}>
        <div>options</div>
      </FilterButton>,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("border-[#D0D5DD]");
    expect(button?.className).not.toContain("border-[#2D7597]");
  });
});
