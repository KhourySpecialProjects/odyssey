import { render, screen, fireEvent } from "@testing-library/react";
import { RegenerateSlugButton } from "@/components/draft/metadata/regenerate-slug";
import { updateDroplet } from "@/lib/actions";
import { useRouter } from "next/navigation";

jest.mock("@/lib/actions", () => ({
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

  it("renders button with correct text", () => {
    render(<RegenerateSlugButton name="Test Droplet" dropletId={1} />);
    expect(screen.getByText("Change URL")).toBeInTheDocument();
  });
});
