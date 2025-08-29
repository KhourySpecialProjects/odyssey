import { render, screen } from "@testing-library/react";
import { DropletBlock } from "@/components/admin/droplets/droplet-block";
import { DropletStatus, DropletType, FocusArea } from "@/types";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("DropletBlock", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "frontend" as FocusArea,
    type: "lesson" as DropletType,
    status: "published" as DropletStatus,
    learningObjectives: [],
    droplet_lessons: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders droplet name correctly", () => {
    render(<DropletBlock droplet={mockDroplet} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  it("shows (Hidden) text when droplet is hidden", () => {
    const hiddenDroplet = { ...mockDroplet, isHidden: true };
    render(<DropletBlock droplet={hiddenDroplet} />);
    expect(screen.getByText("Test Droplet (Hidden)")).toBeInTheDocument();
  });

  it('shows "Hide Droplet" button when droplet is visible', () => {
    render(<DropletBlock droplet={mockDroplet} />);
    expect(
      screen.getByRole("button", { name: /hide droplet/i }),
    ).toBeInTheDocument();
  });

  it('shows "Show Droplet" button when droplet is hidden', () => {
    const hiddenDroplet = { ...mockDroplet, isHidden: true };
    render(<DropletBlock droplet={hiddenDroplet} />);
    expect(
      screen.getByRole("button", { name: /show droplet/i }),
    ).toBeInTheDocument();
  });

  it("shows correct button text based on droplet visibility", () => {
    render(<DropletBlock droplet={mockDroplet} />);

    expect(
      screen.getByRole("button", { name: "Hide Droplet" }),
    ).toBeInTheDocument();
  });
});
