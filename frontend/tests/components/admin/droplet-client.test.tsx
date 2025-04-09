import { DropletClient } from "@/components/admin/droplets/droplet-client";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@/components/admin/droplets/droplet-block", () => ({
  DropletBlock: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>{droplet.name}</div>
  ),
}));

describe("DropletClient", () => {
  const mockDroplets = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${i + 1}`,
    slug: `droplet-${i + 1}`,
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  }));

  it("renders a list of droplets", () => {
    render(<DropletClient droplets={mockDroplets.slice(0, 5)} />);

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-5")).toBeInTheDocument();
  });

  it("displays pagination correctly", () => {
    render(<DropletClient droplets={mockDroplets} />);

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
    expect(screen.queryByTestId("droplet-11")).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /chevron-right/i })).toBeInTheDocument();
    const prevButton = screen.getByRole('button', { name: /chevron-left/i });
    expect(prevButton).toBeDisabled();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(<DropletClient droplets={mockDroplets} />);

    const nextButton = screen.getByRole('button', { name: /chevron-right/i });
    fireEvent.click(nextButton);

    expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("droplet-11")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-15")).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /chevron-left/i })).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(<DropletClient droplets={mockDroplets} />);

    const nextButton = screen.getByRole('button', { name: /chevron-right/i });
    fireEvent.click(nextButton);

    const prevButton = screen.getByRole('button', { name: /chevron-left/i });
    fireEvent.click(prevButton);

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
    expect(screen.queryByTestId("droplet-11")).not.toBeInTheDocument();
  });

  it("displays a message when there are no droplets", () => {
    render(<DropletClient droplets={[]} />);

    expect(
      screen.getByText("There are no created droplets."),
    ).toBeInTheDocument();
  });
});
