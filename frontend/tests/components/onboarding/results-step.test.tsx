import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ResultsStep } from "@/components/onboarding/results-step";
import { Dialog } from "@/components/ui/dialog";
import { createEnrollment } from "@/lib/requests/enrollment";
import { recommendation } from "@/testing/mocks/recommendations";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/enrollment", () => ({ createEnrollment: jest.fn() }));

const picks = [1, 2, 3].map((id) =>
  recommendation(
    { id, name: `Droplet ${id}`, slug: `droplet-${id}` },
    { reason: `Reason ${id}` },
  ),
);
const onLeave = jest.fn();
const setup = (list = picks) =>
  render(
    <Dialog open>
      <ResultsStep picks={list} firstName="Ada" onLeave={onLeave} />
    </Dialog>,
  );

beforeEach(() => jest.clearAllMocks());

describe("ResultsStep", () => {
  it("shows a focused greeting and each pick with its reason", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "You're all set, Ada!" }),
    ).toHaveFocus();
    for (const id of [1, 2, 3]) {
      expect(screen.getByText(`Reason ${id}`)).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("button", { name: "Start droplet" }),
    ).toHaveLength(3);
  });

  it("Start enrolls, leaves, then opens the droplet", async () => {
    jest.mocked(createEnrollment).mockResolvedValue({ ok: true } as never);
    setup();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Start droplet" })[0],
    );
    expect(createEnrollment).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/d/droplet-1");
  });

  it("links the optional tour and leaves on click", async () => {
    setup();
    const tour = screen.getByRole("link", { name: /odyssey tour/i });
    expect(tour).toHaveAttribute("href", "/d/introduction-to-odyssey");
    await userEvent.click(tour);
    expect(onLeave).toHaveBeenCalled();
    expect(createEnrollment).not.toHaveBeenCalled();
  });

  it("Finish leaves and goes to Activity", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Go to my Activity" }),
    );
    expect(onLeave).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/activity");
  });

  it("says so kindly with no picks, keeping the tour and Finish", () => {
    setup([]);
    expect(screen.getByText(/don't have picks for you/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /odyssey tour/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Go to my Activity" }),
    ).toBeVisible();
  });
});
