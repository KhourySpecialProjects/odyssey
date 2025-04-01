import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteDropletButton } from "@/components/draft/metadata/delete-droplet";
import { deepDeleteDroplet } from "@/lib/actions";
import { useRouter } from "next/navigation";

jest.mock("@/lib/actions", () => ({
  deepDeleteDroplet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("DeleteDropletButton", () => {
  const mockRouter = { replace: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders delete button", () => {
    render(<DeleteDropletButton dropletId={1} />);
    expect(screen.getByText("Delete Droplet")).toBeInTheDocument();
  });

  it("shows confirmation dialog when clicked", () => {
    render(<DeleteDropletButton dropletId={1} />);
    fireEvent.click(screen.getByText("Delete Droplet"));
    expect(
      screen.getByText("Are you sure you want to delete this Droplet?"),
    ).toBeInTheDocument();
  });

  it("handles deletion successfully", async () => {
    (deepDeleteDroplet as jest.Mock).mockResolvedValue({ ok: true });

    render(<DeleteDropletButton dropletId={1} />);
    fireEvent.click(screen.getByText("Delete Droplet"));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deepDeleteDroplet).toHaveBeenCalledWith(1);
      expect(mockRouter.replace).toHaveBeenCalledWith("/drafts");
    });
  });
});
