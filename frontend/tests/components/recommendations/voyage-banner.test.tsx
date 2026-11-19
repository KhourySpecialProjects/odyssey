import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { VoyageBanner } from "@/components/recommendations/voyage-banner";
import { createEnrollment } from "@/lib/requests/enrollment";
import { recommendation } from "@/testing/mocks/recommendations";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/enrollment", () => ({ createEnrollment: jest.fn() }));

const mockedEnroll = jest.mocked(createEnrollment);
const next = recommendation(
  { id: 8, name: "JavaScript Basics", slug: "js-basics" },
  {
    rule: "next-in-voyage",
    reason: "Next in your voyage: Web Development Foundations",
  },
);
const start = async () => {
  render(<VoyageBanner recommendation={next} />);
  await userEvent.click(screen.getByRole("button", { name: "Start droplet" }));
};

beforeEach(() => jest.clearAllMocks());

describe("VoyageBanner", () => {
  it("names the voyage step and the next droplet", () => {
    render(<VoyageBanner recommendation={next} />);

    expect(
      screen.getByText("Next in your voyage: Web Development Foundations"),
    ).toBeInTheDocument();
    expect(screen.getByText("JavaScript Basics")).toBeInTheDocument();
  });

  it("Start droplet enrolls the student, then opens the droplet", async () => {
    mockedEnroll.mockResolvedValue({ ok: true });
    await start();

    expect(mockedEnroll).toHaveBeenCalledWith(next.droplet, []);
    expect(mockPush).toHaveBeenCalledWith("/d/js-basics");
  });

  it("stays put and says so when enrolling fails", async () => {
    mockedEnroll.mockResolvedValue({ error: "Database Error" } as never);
    await start();

    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't start JavaScript Basics. Try again.",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
