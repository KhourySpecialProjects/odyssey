import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/rating-stars";
import { changeEnrollmentRating } from "@/lib/requests/enrollment";

jest.mock("@/lib/requests/enrollment", () => ({
  changeEnrollmentRating: jest.fn(),
  getEnrollByID: jest.fn(),
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDropletAverageRating: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const enrollment = jest.requireMock("@/lib/requests/enrollment");
const droplet = jest.requireMock("@/lib/requests/droplet");

function expectNoClientQueries() {
  expect(enrollment.getEnrollByID).not.toHaveBeenCalled();
  expect(enrollment.calculateDropletAverageRating).not.toHaveBeenCalled();
  expect(droplet.updateDropletAverageRating).not.toHaveBeenCalled();
}

describe("StarRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correct number of stars", () => {
    const { container } = render(
      <StarRating value={3} enrollmentID="" average={true} />,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  it("displays average rating correctly", () => {
    const { getByText } = render(
      <StarRating value={3.5} enrollmentID="" average={true} />,
    );
    expect(getByText("3.5")).toBeInTheDocument();
  });

  describe("interactive mode", () => {
    it("starts from the value prop without fetching the enrollment", () => {
      render(<StarRating value={4} enrollmentID="123" average={false} />);

      const stars = screen.getAllByRole("radio", { hidden: true });
      expect(stars[3]).toBeChecked();
      expectNoClientQueries();
    });

    it("resyncs when the value prop changes", () => {
      const { rerender } = render(
        <StarRating value={2} enrollmentID="123" average={false} />,
      );
      rerender(<StarRating value={5} enrollmentID="123" average={false} />);

      const stars = screen.getAllByRole("radio", { hidden: true });
      expect(stars[4]).toBeChecked();
    });

    it("saves the rating with only changeEnrollmentRating and toasts success", async () => {
      (changeEnrollmentRating as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { container } = render(
        <StarRating value={0} enrollmentID="123" average={false} />,
      );
      fireEvent.click(container.querySelectorAll("input")[2]);

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Rating submitted successfully",
        ),
      );
      expect(changeEnrollmentRating).toHaveBeenCalledWith(3, "123");
      expect(container.querySelectorAll("input")[2]).toBeChecked();
      expectNoClientQueries();
    });

    it("toasts an error and keeps the previous rating when the action reports failure", async () => {
      (changeEnrollmentRating as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed to rate enrollment",
      });

      const { container } = render(
        <StarRating value={2} enrollmentID="123" average={false} />,
      );
      fireEvent.click(container.querySelectorAll("input")[4]);

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
      expect(container.querySelectorAll("input")[1]).toBeChecked();
      expect(container.querySelectorAll("input")[4]).not.toBeChecked();
    });

    it("toasts an error and keeps the previous rating when the action throws", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (changeEnrollmentRating as jest.Mock).mockRejectedValue(
        new Error("Update failed"),
      );

      const { container } = render(
        <StarRating value={2} enrollmentID="123" average={false} />,
      );
      fireEvent.click(container.querySelectorAll("input")[4]);

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
      expect(container.querySelectorAll("input")[1]).toBeChecked();
      consoleSpy.mockRestore();
    });
  });
});
