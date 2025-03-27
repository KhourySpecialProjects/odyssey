import { render, screen, fireEvent } from "@testing-library/react";
import { Filter } from "@/components/draft/metadata/filter";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

describe("Filter", () => {
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      handleChange: mockHandleChange,
    });
  });
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it("renders focus area options", () => {
    render(<Filter dropletId={1} initial="FRONTEND" variant="focusArea" />);
    expect(screen.getByText("Focus Area")).toBeInTheDocument();
  });

  it("renders type options", () => {
    render(<Filter dropletId={1} initial="LESSON" variant="type" />);
    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("updates focusArea when variant is focusArea", () => {
    render(<Filter dropletId={1} initial="beginner" variant="focusArea" />);

    const toggleItem = screen.getByText("Technical");
    fireEvent.click(toggleItem);

    expect(mockHandleChange).toHaveBeenCalledWith({ focusArea: "technical" });
  });

  it("updates type when variant is type", () => {
    render(<Filter dropletId={1} initial="tutorial" variant="type" />);

    const toggleItem = screen.getByText("Knowledge");
    fireEvent.click(toggleItem);

    expect(mockHandleChange).toHaveBeenCalledWith({ type: "knowledge" });
  });
});
