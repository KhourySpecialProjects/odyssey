import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { calculateDropletAverageRating } from "@/lib/requests/enrollment";
import { archiveDroplet } from "@/lib/actions";
import { toast } from "sonner";
import { DateTime } from "luxon";

jest.mock("@/lib/requests/enrollment", () => ({
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/lib/actions", () => ({
  archiveDroplet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("DropletTile", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    focusArea: "frontend",
    type: "tutorial",
    tags: [{ id: 1, name: "Tag 1" }],
  };

  beforeEach(() => {
    (calculateDropletAverageRating as jest.Mock).mockResolvedValue(4.5);
  });

  it("renders droplet information", () => {
    render(<DropletTile droplet={mockDroplet as any} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Tutorial")).toBeInTheDocument();
    expect(screen.getByText("Tag 1")).toBeInTheDocument();
  });

  it("shows completion percentage when enrolled", () => {
    render(
      <DropletTile
        droplet={{ ...mockDroplet, lessons: [{ id: 1 }, { id: 2 }] } as any}
        isEnrolled={true}
        completedLessonIds={[1]}
      />,
    );
    expect(screen.getByText("50% Complete")).toBeInTheDocument();
  });

  it("handles archive action", async () => {
    (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });

    render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);
    await fireEvent.click(screen.getByRole("button"));

    expect(archiveDroplet).toHaveBeenCalledWith(mockDroplet, true);
    expect(toast.success).toHaveBeenCalled();
  });

  it("calculates days until due date correctly", () => {
    const tomorrow = DateTime.local().plus({ days: 1 }).toISO();

    render(<DropletTile droplet={mockDroplet as any} dueDate={tomorrow} />);

    expect(screen.getByText("Due in 1 day")).toBeInTheDocument();
  });

  it('shows "Due today!" for same day due dates', () => {
    const today = DateTime.local().toISO();

    render(<DropletTile droplet={mockDroplet as any} dueDate={today} />);

    expect(screen.getByText("Due today!")).toBeInTheDocument();
  });

  it("handles archive/unarchive functionality", async () => {
    (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });

    render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);

    const archiveButton = screen.getByRole("button");
    await fireEvent.click(archiveButton);

    await waitFor(() => {
      expect(archiveDroplet).toHaveBeenCalledWith(mockDroplet, true);
      expect(toast.success).toHaveBeenCalledWith(
        `${mockDroplet.name} is now archived!`,
      );
    });
  });

  it("handles archive/unarchive error", async () => {
    (archiveDroplet as jest.Mock).mockRejectedValue(new Error("Failed"));

    render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);

    const archiveButton = screen.getByRole("button");
    await fireEvent.click(archiveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "An error occurred while updating the droplet",
      );
    });
  });
});
