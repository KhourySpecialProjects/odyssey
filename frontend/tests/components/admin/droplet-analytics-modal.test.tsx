import { render, screen, waitFor } from "@testing-library/react";
import { DropletAnalyticsModal } from "@/components/admin/droplets/droplet-analytics-modal";
import { getDropletAnalytics } from "@/lib/requests/droplet-analytics";

jest.mock("@/lib/requests/droplet-analytics");

const mockGetDropletAnalytics = getDropletAnalytics as jest.Mock;

const baseAnalytics = {
  totalEnrolled: 100,
  completedCount: 60,
  completionRate: 60.0,
  lastMonthEnrolled: 80,
  lastMonthCompleted: 40,
  lastMonthCompletionRate: 50.0,
  averageRating: 4.2,
  lastMonthAverageRating: 3.8,
  lessonCompletion: [],
  scrollDepth: [],
};

const mockDroplet = {
  id: 1,
  name: "Test Droplet",
  slug: "test-droplet",
  lessons: [],
};

describe("DropletAnalyticsModal — Average Rating stat card", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Average Rating card with value and last month when ratings exist", async () => {
    mockGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={mockDroplet}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Average Rating")).toBeInTheDocument();
    });

    expect(screen.getByText("4.2 / 5")).toBeInTheDocument();
    expect(screen.getByText(/Last month:.*3\.8 \/ 5/)).toBeInTheDocument();
  });

  it("shows N/A when averageRating is null (no ratings)", async () => {
    mockGetDropletAnalytics.mockResolvedValue({
      ...baseAnalytics,
      averageRating: null,
      lastMonthAverageRating: null,
    });

    render(
      <DropletAnalyticsModal
        droplet={mockDroplet}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Average Rating")).toBeInTheDocument();
    });

    // The value should be N/A (not a rating string)
    const ratingCards = screen.getAllByText("N/A");
    expect(ratingCards.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all four stat card titles", async () => {
    mockGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={mockDroplet}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Completion Rate")).toBeInTheDocument();
    expect(screen.getByText("Average Rating")).toBeInTheDocument();
  });
});
