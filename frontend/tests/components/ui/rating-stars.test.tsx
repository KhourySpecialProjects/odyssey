import {
  render,
  fireEvent,
  waitFor,
  act,
  screen,
} from "@testing-library/react";
import { StarRating } from "@/components/ui/rating-stars";
import {
  changeEnrollmentRating,
  getEnrollByID,
} from "@/lib/requests/enrollment";

jest.mock("@/lib/requests/enrollment", () => ({
  changeEnrollmentRating: jest.fn(),
  getEnrollByID: jest.fn(),
}));

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

  it("handles rating click in interactive mode", async () => {
    const enrollmentID = "123";
    (changeEnrollmentRating as jest.Mock).mockResolvedValue({});

    const { container } = render(
      <StarRating value={0} enrollmentID={enrollmentID} average={false} />,
    );

    const thirdStar = container.querySelectorAll("input")[2];
    fireEvent.click(thirdStar);

    await waitFor(() => {
      expect(changeEnrollmentRating).toHaveBeenCalledWith(3, enrollmentID);
    });
  });

  it("fetches initial rating on mount", async () => {
    const enrollmentID = "123";
    (getEnrollByID as jest.Mock).mockResolvedValue({ rating: 4 });

    render(
      <StarRating value={0} enrollmentID={enrollmentID} average={false} />,
    );

    await waitFor(() => {
      expect(getEnrollByID).toHaveBeenCalledWith(enrollmentID, {
        fields: ["id", "rating"],
        populate: {},
      });
    });
  });

  jest.mock("@/lib/requests/enrollment", () => ({
    changeEnrollmentRating: jest.fn(),
    getEnrollByID: jest.fn(),
  }));

  describe("StarRating", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("fetches and updates rating on mount for interactive rating", async () => {
      (getEnrollByID as jest.Mock).mockResolvedValue({ rating: 4 });

      await act(async () => {
        render(<StarRating value={3} enrollmentID="123" average={false} />);
      });

      expect(getEnrollByID).toHaveBeenCalledWith("123", {
        fields: ["id", "rating"],
        populate: {},
      });
    });

    it("handles error when fetching rating", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (getEnrollByID as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

      await act(async () => {
        render(<StarRating value={3} enrollmentID="123" average={false} />);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching rating:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("handles error when updating rating", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (changeEnrollmentRating as jest.Mock).mockRejectedValue(
        new Error("Update failed"),
      );

      render(<StarRating value={3} enrollmentID="123" average={false} />);

      const stars = screen.getAllByRole("radio");
      await act(async () => {
        fireEvent.click(stars[4]);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error updating rating:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
