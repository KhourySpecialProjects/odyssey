import { render, screen } from "@testing-library/react";
import { RegenerateSlugButton } from "@/components/draft/metadata/regenerate-slug";
import { useRouter } from "next/navigation";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("RegenerateSlugButton", () => {
  const mockRouter = { replace: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  };

  it("renders button with correct text", () => {
    render(<RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />);
    expect(screen.getByText("Change URL")).toBeInTheDocument();
  });
});
