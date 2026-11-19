import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ActivityRecommendations } from "@/components/recommendations/activity-recommendations";
import { dismissRecommendation } from "@/lib/requests/recommendations";
import { recommendation } from "@/testing/mocks/recommendations";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/recommendations", () => ({
  dismissRecommendation: jest.fn(),
}));

const mockedDismiss = jest.mocked(dismissRecommendation);
const picks = [1, 2, 3, 4, 5].map((id) => recommendation({ id }));
const titles = () =>
  screen.getAllByRole("link").map((link) => link.textContent);

beforeEach(() => jest.clearAllMocks());

describe("ActivityRecommendations", () => {
  it("shows 3 picks, and Refresh shows the next ones", async () => {
    render(<ActivityRecommendations initialPicks={picks} />);
    expect(titles()).toEqual(["Droplet 1", "Droplet 2", "Droplet 3"]);

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(titles()).toEqual(["Droplet 4", "Droplet 5", "Droplet 1"]);
  });

  it("removes a dismissed pick at once, fills its place and saves it", async () => {
    mockedDismiss.mockResolvedValue({ ok: true, error: null, data: null });
    render(<ActivityRecommendations initialPicks={picks} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Not interested in Droplet 2" }),
    );
    expect(titles()).toEqual(["Droplet 1", "Droplet 3", "Droplet 4"]);
    expect(mockedDismiss).toHaveBeenCalledWith(2);
  });

  it("puts the pick back and says so when saving fails", async () => {
    mockedDismiss.mockResolvedValue({
      ok: false,
      error: "Couldn't dismiss that droplet.",
      data: null,
    });
    render(<ActivityRecommendations initialPicks={picks} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Not interested in Droplet 2" }),
    );
    expect(await screen.findByText("Droplet 2")).toBeInTheDocument();
    expect(titles()).toEqual(["Droplet 1", "Droplet 2", "Droplet 3"]);
    expect(toast.error).toHaveBeenCalled();
  });

  it("is hidden with no picks, and has no Refresh with 3 or fewer", () => {
    const { container, rerender } = render(
      <ActivityRecommendations initialPicks={[]} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<ActivityRecommendations initialPicks={picks.slice(0, 3)} />);
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
  });
});
