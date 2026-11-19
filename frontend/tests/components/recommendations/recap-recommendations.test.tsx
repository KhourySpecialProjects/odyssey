import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecapRecommendations } from "@/components/recommendations/recap-recommendations";
import { RecommendationPicksProvider } from "@/components/recommendations/recommendation-picks";
import { dismissRecommendation } from "@/lib/requests/recommendations";
import { recommendation } from "@/testing/mocks/recommendations";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/recommendations", () => ({
  dismissRecommendation: jest.fn(),
}));

const picks = [1, 2, 3, 4, 5, 6].map((id) => recommendation({ id }));
const titles = () =>
  screen.getAllByRole("link").map((link) => link.textContent);
const renderRecap = (bannerDropletId?: number, initialPicks = picks) =>
  render(
    <RecommendationPicksProvider initialPicks={initialPicks}>
      <RecapRecommendations bannerDropletId={bannerDropletId} />
    </RecommendationPicksProvider>,
  );

beforeEach(() => jest.clearAllMocks());

describe("RecapRecommendations", () => {
  it("shows 4 ranked tiles, leaving out the banner's pick, with no See all", () => {
    renderRecap(1);

    expect(
      screen.getByRole("heading", { name: "Extend Your Odyssey" }),
    ).toBeInTheDocument();
    expect(titles()).toEqual([
      "Droplet 2",
      "Droplet 3",
      "Droplet 4",
      "Droplet 5",
    ]);
    expect(screen.queryByText(/see all/i)).not.toBeInTheDocument();
  });

  it("fills a dismissed tile's place and saves the dismissal", async () => {
    jest
      .mocked(dismissRecommendation)
      .mockResolvedValue({ ok: true, error: null, data: null });
    renderRecap();

    await userEvent.click(
      screen.getByRole("button", { name: "Not interested in Droplet 2" }),
    );
    expect(titles()).toEqual([
      "Droplet 1",
      "Droplet 3",
      "Droplet 4",
      "Droplet 5",
    ]);
    expect(dismissRecommendation).toHaveBeenCalledWith(2);
  });

  it("is hidden with no picks besides the banner's", () => {
    const { container } = renderRecap(1, picks.slice(0, 1));
    expect(container).toBeEmptyDOMElement();
  });
});
