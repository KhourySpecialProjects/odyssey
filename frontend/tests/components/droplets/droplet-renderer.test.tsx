import { render, screen } from "@testing-library/react";
import { DropletRenderer } from "@/components/droplets/droplet-renderer";
import useDebugStore from "@/stores/debug-toggle-store";

jest.mock("@/stores/debug-toggle-store", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("DropletRenderer", () => {
  const mockDroplet = {
    name: "Test Droplet",
    type: "tutorial",
    focusArea: "frontend",
    lessons: [
      {
        blocks: [
          {
            __component: "droplets.video",
            url: "https://test.com",
            content: "",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    (useDebugStore as unknown as jest.Mock).mockReturnValue(false);
  });

  it("renders droplet information", () => {
    render(<DropletRenderer droplet={mockDroplet} />);
    expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
    expect(screen.getByText(/frontend/)).toBeInTheDocument();
  });

});
