import { render, screen } from "@testing-library/react";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";

describe("DropletsSkeleton", () => {
  it("renders three skeleton items", () => {
    render(<DropletsSkeleton />);
    const skeletons = screen.getAllByTestId("skeleton-item");
    expect(skeletons).toHaveLength(3);
  });
});
