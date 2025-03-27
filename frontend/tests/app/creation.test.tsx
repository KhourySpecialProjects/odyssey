import { render, screen } from "@testing-library/react";
import Loading from "@/app/(creation)/new/droplet/loading";

jest.mock("@/components/new/new-droplet", () => ({
  CreateDroplet: () => (
    <div data-testid="create-droplet">Mock CreateDroplet Component</div>
  ),
}));

describe("Droplet Creation Pages", () => {
  describe("Loading Component", () => {
    it("renders loading spinner", () => {
      render(<Loading />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveClass("animate-spin");
    });
  });
});
