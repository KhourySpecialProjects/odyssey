import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddDropletDialog } from "@/components/group/add-droplet-dialog";
import { getDroplets } from "@/lib/requests/droplet";
import { makeDroplet, makeTag } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/requests/droplet", () => ({
  getDroplets: jest.fn(),
}));

const mockedGetDroplets = jest.mocked(getDroplets);

describe("AddDropletDialog", () => {
  const mockDroplets = [
    makeDroplet({
      id: 1,
      name: "Droplet 1",
      slug: "test-droplet-1",
      isHidden: false,
      focusArea: "personal",
      type: "knowledge",
      tags: [makeTag({ id: 1, name: "React" })],
      learningObjectives: [],
      status: "published",
    }),
    makeDroplet({
      id: 2,
      name: "Droplet 2",
      slug: "test-droplet-2",
      isHidden: false,
      focusArea: "personal",
      type: "knowledge",
      tags: [makeTag({ id: 1, name: "React" })],
      learningObjectives: [],
      status: "published",
    }),
    makeDroplet({
      id: 3,
      name: "Another Droplet",
      slug: "test-droplet-3",
      isHidden: false,
      focusArea: "personal",
      type: "knowledge",
      tags: [makeTag({ id: 1, name: "React" })],
      learningObjectives: [],
      status: "published",
    }),
  ];
  const mockOnAddDroplets = jest.fn();

  beforeEach(() => {
    mockedGetDroplets.mockResolvedValue(mockDroplets);
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
    makeDroplet({
      id: 4,
      name: "Current Droplet",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "personal",
      type: "knowledge",
      tags: [makeTag({ id: 1, name: "React" })],
      learningObjectives: [],
      status: "published",
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDroplets.mockResolvedValue(mockDroplets);
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

    const addButtons = screen.getAllByRole("button");
    fireEvent.click(addButtons[1]);

    fireEvent.click(screen.getByText("Add 1 Droplet"));

    expect(handleAddDroplets).toHaveBeenCalledWith([mockDroplets[0]]);
  });
});
