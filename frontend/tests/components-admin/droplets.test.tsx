import { render, screen } from "@testing-library/react";
import { fetchDroplets } from "@/lib/requests/data";
import { Droplets } from "@/components/admin/droplets/droplets";

jest.mock("@/lib/requests/data", () => ({
  fetchDroplets: jest.fn(),
}));

jest.mock("@/components/admin/droplets/create-droplet", () => ({
  CreateDroplet: () => (
    <div data-testid="create-droplet">Create Droplet Button</div>
  ),
}));

jest.mock("@/components/admin/droplets/droplet-client", () => ({
  DropletClient: ({ droplets }: { droplets: any[] }) => (
    <div data-testid="droplet-client">
      Droplet Client with {droplets.length} droplets
    </div>
  ),
}));

describe("Droplets", () => {
  const mockDroplets = [
    {
      id: 1,
      name: "Test Droplet",
      slug: "test-droplet",
      isHidden: false,
      focusArea: "FRONTEND",
      type: "LESSON",
      tags: [{ id: 1, name: "React" }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchDroplets as jest.Mock).mockResolvedValue(mockDroplets);
  });

  it("renders the component with correct heading", async () => {
    render(await Droplets());

    expect(screen.getByText("Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("The following droplets have been created."),
    ).toBeInTheDocument();
  });

  it("includes the CreateDroplet component", async () => {
    render(await Droplets());

    expect(screen.getByTestId("create-droplet")).toBeInTheDocument();
  });

  it("passes fetched droplets to DropletClient", async () => {
    render(await Droplets());

    expect(screen.getByTestId("droplet-client")).toBeInTheDocument();
    expect(
      screen.getByText("Droplet Client with 1 droplets"),
    ).toBeInTheDocument();
  });

  it("calls fetchDroplets to get data", async () => {
    render(await Droplets());

    expect(fetchDroplets).toHaveBeenCalledTimes(1);
  });
});
