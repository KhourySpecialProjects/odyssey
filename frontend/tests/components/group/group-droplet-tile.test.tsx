import { render, screen } from "@testing-library/react";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { DateTime } from "luxon";
import { makeDroplet, makeTag } from "@/lib/testing/mock-helpers";

describe("GroupDropletTile", () => {
  const mockDroplet = makeDroplet({
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal",
    type: "knowledge",
    tags: [makeTag({ id: 1, name: "React" })],
    learningObjectives: [],
    status: "published",
  });

  it("renders droplet information", () => {
    render(<GroupDropletTile droplet={mockDroplet} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
  });

  it("shows due date when provided", () => {
    const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
    render(<GroupDropletTile droplet={mockDroplet} dueDate={tomorrow} />);
    expect(screen.getByText(/due/i)).toBeInTheDocument();
  });

  it("shows due date late when provided", () => {
    const yesterday = DateTime.local().minus({ days: 1 }).toISO();
    render(<GroupDropletTile droplet={mockDroplet} dueDate={yesterday} />);
    expect(screen.getByText(/late/i)).toBeInTheDocument();
  });

  it("shows due date today when provided", () => {
    const today = DateTime.local().toISO();
    render(<GroupDropletTile droplet={mockDroplet} dueDate={today} />);
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });

  it("shows lesson count", () => {
    render(<GroupDropletTile droplet={mockDroplet} />);
    expect(screen.getByText("0 lessons")).toBeInTheDocument();
  });
});
