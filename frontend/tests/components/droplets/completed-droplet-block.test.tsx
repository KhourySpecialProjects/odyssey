import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompletedDropletBlock } from "@/components/droplets/completed-droplet-block";
import { RecommendationPicksProvider } from "@/components/recommendations/recommendation-picks";
import { createFriendAnnouncement } from "@/lib/requests/feed";
import {
  createEnrollment,
  updateEnrollmentFirstTime,
} from "@/lib/requests/enrollment";
import { dismissRecommendation } from "@/lib/requests/recommendations";
import { recommendation } from "@/testing/mocks/recommendations";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  createEnrollment: jest.fn(),
  updateEnrollmentFirstTime: jest.fn(),
}));

jest.mock("@/lib/requests/recommendations", () => ({
  dismissRecommendation: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createFriendAnnouncement: jest.fn(),
}));

jest.mock("@/components/gradient-bg", () => ({
  GradientBackground: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("CompletedDropletBlock", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
  };

  const mockEnrollment = {
    id: "enrollment-123",
    isFirstTime: true,
  };

  const mockAuthUser = {
    id: 1,
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (updateEnrollmentFirstTime as jest.Mock).mockResolvedValue({});
    (createFriendAnnouncement as jest.Mock).mockResolvedValue({});
  });

  it("renders completion message with droplet name", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
    expect(screen.getByText(/Test Droplet/)).toBeInTheDocument();
    expect(screen.getByText(/You did it!/)).toBeInTheDocument();
  });

  it("shows dialog when isFirstTime is true", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not show dialog when isFirstTime is false", () => {
    const notFirstTime = { ...mockEnrollment, isFirstTime: false };

    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={notFirstTime as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders Share with friends button", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(screen.getByText("Share with friends")).toBeInTheDocument();
  });

  it("share button is not disabled", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    const shareButton = screen.getByText("Share with friends");
    expect(shareButton).not.toBeDisabled();
  });

  it("handles droplet with special characters in name", () => {
    const specialDroplet = {
      ...mockDroplet,
      name: "Droplet & <Special> Characters",
    };

    render(
      <CompletedDropletBlock
        droplet={specialDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(
      screen.getByText(/Droplet & <Special> Characters/),
    ).toBeInTheDocument();
  });

  describe("with the Recap page's picks (ODY-961)", () => {
    const picks = [
      recommendation(
        { id: 11, name: "JavaScript Basics", slug: "js-basics" },
        { rule: "next-in-voyage", reason: "Next in your voyage: Web Dev" },
      ),
      recommendation({ id: 12, name: "Databases" }),
      recommendation({ id: 13, name: "Behavioral Interviews" }),
      recommendation({ id: 14, name: "Resumes" }),
    ];
    const renderWithPicks = () =>
      render(
        <RecommendationPicksProvider initialPicks={picks}>
          <CompletedDropletBlock
            droplet={mockDroplet as any}
            enrollment={mockEnrollment as any}
            authUser={mockAuthUser as any}
          />
        </RecommendationPicksProvider>,
      );
    const moreForYou = () =>
      screen
        .getAllByRole("listitem")
        .map((row) => row.querySelector("a")?.textContent);

    it("shows the top pick as Up next and the next two as More for you", () => {
      renderWithPicks();

      const upNext = screen.getByRole("region", { name: "Up next" });
      expect(upNext).toHaveTextContent("Next in your voyage: Web Dev");
      expect(upNext).toHaveTextContent("JavaScript Basics");
      expect(moreForYou()).toEqual(["Databases", "Behavioral Interviews"]);
    });

    it("Start droplet enrolls, marks the dialog seen and opens the droplet", async () => {
      (createEnrollment as jest.Mock).mockResolvedValue({ ok: true });
      renderWithPicks();

      await userEvent.click(
        screen.getByRole("button", { name: "Start droplet" }),
      );
      expect(createEnrollment).toHaveBeenCalledWith(picks[0].droplet, []);
      expect(updateEnrollmentFirstTime).toHaveBeenCalledWith("enrollment-123");
      expect(mockPush).toHaveBeenCalledWith("/d/js-basics");
    });

    it("✕ hides a More for you pick, saves it and fills its place", async () => {
      (dismissRecommendation as jest.Mock).mockResolvedValue({
        ok: true,
        error: null,
        data: null,
      });
      renderWithPicks();

      await userEvent.click(
        screen.getByRole("button", { name: "Not interested in Databases" }),
      );
      expect(dismissRecommendation).toHaveBeenCalledWith(12);
      expect(moreForYou()).toEqual(["Behavioral Interviews", "Resumes"]);
    });

    it("has one close button, and View recap closes the dialog", async () => {
      renderWithPicks();
      expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);

      await userEvent.click(screen.getByRole("button", { name: "View recap" }));
      expect(updateEnrollmentFirstTime).toHaveBeenCalledWith("enrollment-123");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  it("without picks shows no Up next or More for you", () => {
    render(
      <CompletedDropletBlock
        droplet={mockDroplet as any}
        enrollment={mockEnrollment as any}
        authUser={mockAuthUser as any}
      />,
    );

    expect(
      screen.queryByRole("region", { name: "Up next" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("More for you")).not.toBeInTheDocument();
  });
});
