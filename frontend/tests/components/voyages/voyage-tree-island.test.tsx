import { render, screen } from "@testing-library/react";
import { VoyageTreeIsland } from "@/components/voyages/voyage-tree-island";

describe("VoyageTreeIsland interactivity", () => {
  it("has no pointer or hover-scale class and no link when unavailable", () => {
    const { container } = render(
      <VoyageTreeIsland
        label="Node"
        size="main"
        nodeType="droplet"
        unavailable
      />,
    );

    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
    expect(container.innerHTML).not.toContain("cursor-pointer");
    expect(container.innerHTML).not.toContain("hover:scale-105");
  });

  it("keeps In Progress with no pointer class for a claimed, unlinked node", () => {
    const { container } = render(
      <VoyageTreeIsland
        label="Node"
        size="main"
        nodeType="droplet"
        claimStatus="claimed"
      />,
    );

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("cursor-pointer");
  });

  it("keeps pointer and hover-scale when linked", () => {
    const { container } = render(
      <VoyageTreeIsland label="Node" size="main" nodeType="droplet" slug="d" />,
    );

    expect(container.querySelector("a")).not.toBeNull();
    expect(container.innerHTML).toContain("cursor-pointer");
    expect(container.innerHTML).toContain("hover:scale-105");
  });
});
