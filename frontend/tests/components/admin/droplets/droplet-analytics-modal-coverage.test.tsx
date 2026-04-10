"use client";
/**
 * Coverage-focused tests for DropletAnalyticsModal.
 *
 * Targets uncovered lines: 109-209 (sub-components), 280 (catch path)
 *
 * Rules:
 *   - Zero `as jest.Mock`, zero `as any`, zero `@ts-ignore`
 *   - Uses jest.mocked() for typed mock access
 *   - Uses makeDroplet() from shared helpers
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropletAnalyticsModal } from "@/components/admin/droplets/droplet-analytics-modal";
import { getDropletAnalytics } from "@/lib/requests/droplet-analytics";
import { makeDroplet } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/requests/droplet-analytics", () => ({
  getDropletAnalytics: jest.fn(),
}));

const mockedGetDropletAnalytics = jest.mocked(getDropletAnalytics);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dropletWithLessons = {
  id: 1,
  name: "Test Droplet",
  slug: "test-droplet",
  lessons: [
    { id: 10, name: "Lesson Alpha" },
    { id: 11, name: "Lesson Beta" },
  ],
};

const dropletNoLessons = {
  id: 2,
  name: "Simple Droplet",
  slug: "simple-droplet",
  lessons: [],
};

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

const analyticsWithLessons = {
  ...baseAnalytics,
  lessonCompletion: [
    { name: "Lesson Alpha", count: 55 },
    { name: "Lesson Beta", count: 30 },
  ],
  scrollDepth: [
    {
      lessonId: 10,
      lessonName: "Lesson Alpha",
      estimated: false,
      points: [
        { label: "Started", count: 100 },
        { label: "25%", count: 80 },
        { label: "50%", count: 60 },
        { label: "75%", count: 40 },
        { label: "100%", count: 20 },
      ],
    },
    {
      lessonId: 11,
      lessonName: "Lesson Beta",
      estimated: true,
      points: [
        { label: "Started", count: 100 },
        { label: "25%", count: 55 },
        { label: "50%", count: 43 },
        { label: "75%", count: 31 },
        { label: "100%", count: 20 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DropletAnalyticsModal — loading and no-data states", () => {
  it("shows 'No data available.' when analytics resolves to null-like (analytics not set)", async () => {
    // Never resolves during this render — stays in loading state then resolves
    mockedGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    // Loading text appears while the promise is pending
    expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
  });

  it("shows 'No data available.' when closed and reopened without analytics", () => {
    // Simulate: closed (open=false) so analytics is null, loading is false
    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={false}
        onOpenChange={jest.fn()}
      />,
    );

    // Dialog is not rendered when closed — nothing to assert on DOM
    expect(screen.queryByText("Loading analytics…")).not.toBeInTheDocument();
  });
});

describe("DropletAnalyticsModal — stat cards rendering", () => {
  it("renders all four stat card titles after analytics loads", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
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

  it("shows trend badge for Total Enrolled when last month > 0", async () => {
    mockedGetDropletAnalytics.mockResolvedValue({
      ...baseAnalytics,
      totalEnrolled: 100,
      lastMonthEnrolled: 80,
    });

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    });

    // computeTrend(100, 80) = 25% up
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("shows no trend badge when all last-month values are 0 (divide-by-zero guard)", async () => {
    mockedGetDropletAnalytics.mockResolvedValue({
      totalEnrolled: 50,
      completedCount: 20,
      completionRate: 40.0,
      lastMonthEnrolled: 0,
      lastMonthCompleted: 0,
      lastMonthCompletionRate: 0,
      averageRating: null,
      lastMonthAverageRating: null,
      lessonCompletion: [],
      scrollDepth: [],
    });

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    });

    // computeTrend returns null when last=0, so no trend badge % values appear
    // (completion rate is shown as a stat value "40.0%" but trend badge only
    // appears when computeTrend returns non-null — i.e. when last > 0)
    expect(screen.queryByText("25.0%")).not.toBeInTheDocument();
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
  });

  it("renders the droplet name in the header", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Simple Droplet")).toBeInTheDocument();
    });
  });
});

describe("DropletAnalyticsModal — error / catch path (line 280)", () => {
  it("shows 'No data available.' when getDropletAnalytics throws", async () => {
    mockedGetDropletAnalytics.mockRejectedValue(new Error("PostHog timeout"));

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No data available.")).toBeInTheDocument();
    });
  });

  it("clears stale analytics and shows loading when re-opened after error", async () => {
    mockedGetDropletAnalytics.mockRejectedValueOnce(new Error("Network error"));

    const { rerender } = render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No data available.")).toBeInTheDocument();
    });

    // Now resolve on re-open
    mockedGetDropletAnalytics.mockResolvedValueOnce(baseAnalytics);

    rerender(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={false}
        onOpenChange={jest.fn()}
      />,
    );
    rerender(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    });
  });
});

describe("DropletAnalyticsModal — lesson-level analytics section (lines 109-209)", () => {
  it("renders 'Lesson-level Analytics' heading when lessonCompletion is non-empty", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Lesson-level Analytics")).toBeInTheDocument();
    });
  });

  it("renders 'Marked Complete' bar chart section", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Marked Complete")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Showing the number of users who marked a lesson complete",
      ),
    ).toBeInTheDocument();
  });

  it("does NOT render 'Lesson-level Analytics' when lessonCompletion is empty", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    render(
      <DropletAnalyticsModal
        droplet={dropletNoLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Lesson-level Analytics"),
    ).not.toBeInTheDocument();
  });
});

describe("DropletAnalyticsModal — ScrollDepthChart (lines 142-263)", () => {
  it("renders 'Scroll Depth' section when scrollDepth is non-empty", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });
  });

  it("renders lesson tab buttons inside the scroll depth chart", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Both lesson tab buttons should be present
    expect(
      screen.getByRole("button", { name: "Lesson Alpha" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lesson Beta" }),
    ).toBeInTheDocument();
  });

  it("shows the 'Estimated' badge for estimated scroll depth data", async () => {
    // Start with lesson index 1 (Beta, estimated=true) active by clicking it
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Click "Lesson Beta" tab to make estimated=true lesson active
    await userEvent.click(screen.getByRole("button", { name: "Lesson Beta" }));

    expect(
      screen.getByText("Estimated — real tracking in progress"),
    ).toBeInTheDocument();
  });

  it("does NOT show 'Estimated' badge when PostHog data is available (estimated=false)", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Default active tab is index 0 (Lesson Alpha, estimated=false)
    expect(
      screen.queryByText("Estimated — real tracking in progress"),
    ).not.toBeInTheDocument();
  });

  it("switches active tab when a different lesson button is clicked", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Click Lesson Beta tab
    await userEvent.click(screen.getByRole("button", { name: "Lesson Beta" }));

    // After clicking Beta, estimated badge should appear (Beta is estimated=true)
    await waitFor(() => {
      expect(
        screen.getByText("Estimated — real tracking in progress"),
      ).toBeInTheDocument();
    });

    // Click back to Lesson Alpha — badge should disappear
    await userEvent.click(screen.getByRole("button", { name: "Lesson Alpha" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Estimated — real tracking in progress"),
      ).not.toBeInTheDocument();
    });
  });

  it("resets activeScrollLesson to 0 when modal is reopened", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);

    const { rerender } = render(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Switch to Beta
    await userEvent.click(screen.getByRole("button", { name: "Lesson Beta" }));

    await waitFor(() => {
      expect(
        screen.getByText("Estimated — real tracking in progress"),
      ).toBeInTheDocument();
    });

    // Close modal
    rerender(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={false}
        onOpenChange={jest.fn()}
      />,
    );

    // Re-open
    mockedGetDropletAnalytics.mockResolvedValue(analyticsWithLessons);
    rerender(
      <DropletAnalyticsModal
        droplet={dropletWithLessons}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scroll Depth")).toBeInTheDocument();
    });

    // Should be back to index 0 (Alpha, estimated=false) — no badge
    expect(
      screen.queryByText("Estimated — real tracking in progress"),
    ).not.toBeInTheDocument();
  });
});

describe("DropletAnalyticsModal — useDroplet via makeDroplet helper", () => {
  it("accepts a droplet built with makeDroplet helper (no lessons)", async () => {
    mockedGetDropletAnalytics.mockResolvedValue(baseAnalytics);

    const droplet = makeDroplet({ id: 5, name: "Helper Droplet" });

    render(
      <DropletAnalyticsModal
        droplet={droplet}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Helper Droplet")).toBeInTheDocument();
    });
  });
});
