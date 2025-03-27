import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddDropletDialog } from "@/components/group/add-droplet-dialog";
import { getDroplets } from "@/lib/requests/droplet";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";

jest.mock("@/lib/requests/droplet", () => ({
  getDroplets: jest.fn(),
}));

describe("AddDropletDialog", () => {
  const mockDroplets = [
    {
      id: 1,
      name: "Droplet 1",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "personal" as FocusArea,
      type: "knowledge" as DropletType,
      tags: [{ id: 1, name: "React" }] as Tag[],
      learningObjectives: [],
      status: "published" as DropletStatus,
      droplet_lessons: [],
    },
    {
      id: 1,
      name: "Droplet 2",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "personal" as FocusArea,
      type: "knowledge" as DropletType,
      tags: [{ id: 1, name: "React" }] as Tag[],
      learningObjectives: [],
      status: "published" as DropletStatus,
      droplet_lessons: [],
    },
    {
      id: 1,
      name: "Another Droplet",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "personal" as FocusArea,
      type: "knowledge" as DropletType,
      tags: [{ id: 1, name: "React" }] as Tag[],
      learningObjectives: [],
      status: "published" as DropletStatus,
      droplet_lessons: [],
    },
  ];
  const mockOnAddDroplets = jest.fn();

  beforeEach(() => {
    (getDroplets as jest.Mock).mockResolvedValue(mockDroplets);
  });

  it("renders add droplet button", () => {
    render(
      <AddDropletDialog
        currentDroplets={[]}
        onAddDroplets={mockOnAddDroplets}
      />,
    );
    expect(screen.getByText("Add Droplet")).toBeInTheDocument();
  });

  const mockCurrentDroplets = [
    {
      id: 4,
      name: "Current Droplet",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "personal" as FocusArea,
      type: "knowledge" as DropletType,
      tags: [{ id: 1, name: "React" }] as Tag[],
      learningObjectives: [],
      status: "published" as DropletStatus,
      droplet_lessons: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getDroplets as jest.Mock).mockResolvedValue(mockDroplets);
  });

  it("renders add droplet button", () => {
    render(
      <AddDropletDialog
        currentDroplets={mockCurrentDroplets}
        onAddDroplets={() => {}}
      />,
    );

    expect(screen.getByText("Add Droplet")).toBeInTheDocument();
  });

  it("loads available droplets when opened", async () => {
    render(
      <AddDropletDialog
        currentDroplets={mockCurrentDroplets}
        onAddDroplets={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Add Droplet"));

    await waitFor(() => {
      expect(getDroplets).toHaveBeenCalled();
    });

    expect(screen.getByText("Droplet 1")).toBeInTheDocument();
    expect(screen.getByText("Droplet 2")).toBeInTheDocument();
  });

  it("filters droplets based on search", async () => {
    render(
      <AddDropletDialog
        currentDroplets={mockCurrentDroplets}
        onAddDroplets={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Add Droplet"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search droplets..."),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search droplets..."), {
      target: { value: "Another" },
    });

    expect(screen.getByText("Another Droplet")).toBeInTheDocument();
    expect(screen.queryByText("Droplet 1")).not.toBeInTheDocument();
  });

  it("handles adding droplets", async () => {
    const handleAddDroplets = jest.fn();

    render(
      <AddDropletDialog
        currentDroplets={mockCurrentDroplets}
        onAddDroplets={handleAddDroplets}
      />,
    );

    fireEvent.click(screen.getByText("Add Droplet"));

    await waitFor(() => {
      expect(screen.getByText("Droplet 1")).toBeInTheDocument();
    });

    // Click the add button for the first droplet
    const addButtons = screen.getAllByRole("button");
    fireEvent.click(addButtons[1]); // First droplet's add button

    // Click done
    fireEvent.click(screen.getByText("Add 1 Droplet"));

    expect(handleAddDroplets).toHaveBeenCalledWith([mockDroplets[0]]);
  });
});
