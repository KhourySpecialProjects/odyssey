import {
  render,
  fireEvent,
  waitFor,
  act,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "@/components/ui/rating-stars";
import {
  changeEnrollmentRating,
  getEnrollByID,
} from "@/lib/requests/enrollment";

jest.mock("@/lib/requests/enrollment", () => ({
  changeEnrollmentRating: jest.fn(),
  getEnrollByID: jest.fn(),
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDropletAverageRating: jest.fn(),
}));

describe("StarRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Keyboard and screen reader access", () => {
    it("exposes the stars as one labelled radio group with a label per star", () => {
      (getEnrollByID as jest.Mock).mockResolvedValue({ rating: 0 });
      render(<StarRating value={0} enrollmentID="123" average={false} />);

      const group = screen.getByRole("radiogroup", { name: "Rating" });
      const radios = screen.getAllByRole("radio");
      expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
        "1 star",
        "2 stars",
        "3 stars",
        "4 stars",
        "5 stars",
      ]);
      // One group, so Tab enters it once and arrow keys move between stars
      expect(new Set(radios.map((r) => r.getAttribute("name"))).size).toBe(1);
      radios.forEach((r) => {
        expect(group).toContainElement(r);
        // Visually hidden but still focusable (`hidden` removed it entirely)
        expect(r).toHaveClass("sr-only");
        expect(r).not.toHaveClass("hidden");
      });
    });

    it("can be reached with Tab and rated with the keyboard", async () => {
      const user = userEvent.setup();
      (getEnrollByID as jest.Mock).mockResolvedValue({
        rating: 0,
        droplet: { id: 9 },
      });
      (changeEnrollmentRating as jest.Mock).mockResolvedValue({});
      render(<StarRating value={0} enrollmentID="123" average={false} />);

      await user.tab();
      expect(screen.getByRole("radio", { name: "1 star" })).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      await waitFor(() =>
        expect(changeEnrollmentRating).toHaveBeenCalledWith(2, "123"),
      );
    });
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
