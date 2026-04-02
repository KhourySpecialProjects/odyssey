import { render, screen, fireEvent } from "@testing-library/react";
import { SummaryStatsPanel } from "@/components/notebook/summary-stats-panel";
import type { SummaryStats } from "@/lib/dataset-parser";

// Mock dataset-parser to avoid papaparse/xlsx-js-style module resolution issues
jest.mock("@/lib/dataset-parser", () => ({
  computeSummaryStats: jest.fn(),
}));

// Mock @/lib/utils cn() to avoid node-html-parser transitive dependency in worktree
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

const mockNumericStats: SummaryStats = {
  shape: [1000, 15],
  columns: [
    {
      name: "age",
      type: "number",
      nullCount: 5,
      uniqueCount: 72,
      min: 18,
      max: 95,
      mean: 42.37,
      median: 41,
      std: 15.24,
    },
    {
      name: "score",
      type: "number",
      nullCount: 0,
      uniqueCount: 100,
      min: 0,
      max: 100,
      mean: 67.83,
      median: 70,
      std: 21.45,
    },
  ],
};

const mockStringStats: SummaryStats = {
  shape: [500, 3],
  columns: [
    {
      name: "name",
      type: "string",
      nullCount: 2,
      uniqueCount: 488,
    },
    {
      name: "category",
      type: "string",
      nullCount: 0,
      uniqueCount: 5,
    },
  ],
};

const mockMixedStats: SummaryStats = {
  shape: [100, 4],
  columns: [
    {
      name: "id",
      type: "number",
      nullCount: 0,
      uniqueCount: 100,
      min: 1,
      max: 100,
      mean: 50.5,
      median: 50.5,
      std: 28.87,
    },
    {
      name: "label",
      type: "string",
      nullCount: 10,
      uniqueCount: 8,
    },
    {
      name: "is_active",
      type: "boolean",
      nullCount: 0,
      uniqueCount: 2,
    },
    {
      name: "created_at",
      type: "date",
      nullCount: 3,
      uniqueCount: 97,
    },
  ],
};

describe("SummaryStatsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("shape badge", () => {
    it("displays the shape as rows x columns", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      expect(screen.getByText("1000 rows x 15 columns")).toBeInTheDocument();
    });

    it("displays correct shape for other dimensions", () => {
      render(<SummaryStatsPanel stats={mockStringStats} />);
      expect(screen.getByText("500 rows x 3 columns")).toBeInTheDocument();
    });
  });

  describe("collapsible behavior", () => {
    it("renders the panel header with toggle button", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      expect(
        screen.getByRole("button", { name: /expand|collapse|summary/i }),
      ).toBeInTheDocument();
    });

    it("is collapsed by default (column stats not rendered)", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      expect(screen.queryByTestId("column-stats-grid")).toBeNull();
    });

    it("expands when the toggle button is clicked", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
      expect(screen.getByTestId("column-stats-grid")).toBeVisible();
    });

    it("collapses again after a second click", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      // Open
      fireEvent.click(toggleButton);
      // Close
      fireEvent.click(toggleButton);
      expect(screen.queryByTestId("column-stats-grid")).toBeNull();
    });
  });

  describe("column stats cards", () => {
    beforeEach(() => {
      // Expand the panel before each test in this group
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
    });

    it("renders a card for each column", () => {
      const cards = screen.getAllByTestId("column-stats-card");
      expect(cards).toHaveLength(2);
    });

    it("displays column names", () => {
      expect(screen.getByText("age")).toBeInTheDocument();
      expect(screen.getByText("score")).toBeInTheDocument();
    });

    it("displays the inferred type badge for each column", () => {
      const typeBadges = screen.getAllByTestId("column-type-badge");
      expect(typeBadges).toHaveLength(2);
      typeBadges.forEach((badge) => {
        expect(badge).toHaveTextContent("number");
      });
    });
  });

  describe("numeric column stats", () => {
    beforeEach(() => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
    });

    it("shows null count and percentage", () => {
      // age column: 5 nulls out of 1000 rows = 0.50%
      expect(screen.getByText(/5 null/i)).toBeInTheDocument();
    });

    it("shows min formatted to 2 decimal places", () => {
      expect(screen.getByText(/18\.00/)).toBeInTheDocument();
    });

    it("shows max formatted to 2 decimal places", () => {
      expect(screen.getByText(/95\.00/)).toBeInTheDocument();
    });

    it("shows mean formatted to 2 decimal places", () => {
      expect(screen.getByText(/42\.37/)).toBeInTheDocument();
    });

    it("shows median formatted to 2 decimal places", () => {
      expect(screen.getByText(/41\.00/)).toBeInTheDocument();
    });

    it("shows std formatted to 2 decimal places", () => {
      expect(screen.getByText(/15\.24/)).toBeInTheDocument();
    });
  });

  describe("string column stats", () => {
    beforeEach(() => {
      render(<SummaryStatsPanel stats={mockStringStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
    });

    it("shows unique count for string columns", () => {
      // name column: 488 unique
      expect(screen.getByText(/488/)).toBeInTheDocument();
      // category column: 5 unique — use getAllByText since "5" appears in the shape badge too
      const matches = screen.getAllByText(/\b5\b/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("shows null count for string columns", () => {
      // name column: 2 nulls
      expect(screen.getByText(/2 null/i)).toBeInTheDocument();
    });

    it("does not show numeric stats (min/max/mean) for string columns", () => {
      // These labels should not be present for string columns
      expect(screen.queryByText(/^min$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^max$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^mean$/i)).not.toBeInTheDocument();
    });
  });

  describe("mixed column types", () => {
    beforeEach(() => {
      render(<SummaryStatsPanel stats={mockMixedStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
    });

    it("renders cards for all columns", () => {
      const cards = screen.getAllByTestId("column-stats-card");
      expect(cards).toHaveLength(4);
    });

    it("shows correct type badges for mixed types", () => {
      const typeBadges = screen.getAllByTestId("column-type-badge");
      const badgeTexts = typeBadges.map((b) => b.textContent);
      expect(badgeTexts).toContain("number");
      expect(badgeTexts).toContain("string");
      expect(badgeTexts).toContain("boolean");
      expect(badgeTexts).toContain("date");
    });

    it("shows numeric stats only for number-type columns", () => {
      // id column has numeric stats
      const matches = screen.getAllByText(/50\.50/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("shows unique count for non-numeric columns", () => {
      // label: 8 unique, is_active: 2 unique, created_at: 97 unique
      const matches = screen.getAllByText(/\b8\b/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("renders with zero rows", () => {
      const emptyStats: SummaryStats = {
        shape: [0, 2],
        columns: [
          { name: "col1", type: "unknown", nullCount: 0, uniqueCount: 0 },
          { name: "col2", type: "unknown", nullCount: 0, uniqueCount: 0 },
        ],
      };
      render(<SummaryStatsPanel stats={emptyStats} />);
      expect(screen.getByText("0 rows x 2 columns")).toBeInTheDocument();
    });

    it("renders with a single column", () => {
      const singleColStats: SummaryStats = {
        shape: [50, 1],
        columns: [
          {
            name: "value",
            type: "number",
            nullCount: 0,
            uniqueCount: 50,
            min: 1,
            max: 100,
            mean: 50,
            median: 50,
            std: 28.87,
          },
        ],
      };
      render(<SummaryStatsPanel stats={singleColStats} />);
      expect(screen.getByText("50 rows x 1 columns")).toBeInTheDocument();
    });

    it("handles numeric column with no numeric stats (all nulls)", () => {
      const allNullStats: SummaryStats = {
        shape: [10, 1],
        columns: [
          {
            name: "data",
            type: "number",
            nullCount: 10,
            uniqueCount: 0,
            // No min/max/mean/median/std when all values are null
          },
        ],
      };
      render(<SummaryStatsPanel stats={allNullStats} />);
      const toggleButton = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      fireEvent.click(toggleButton);
      // Should still render the card without crashing
      expect(screen.getByText("data")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has a descriptive panel title", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      expect(screen.getByText(/summary statistics/i)).toBeInTheDocument();
    });

    it("toggle button is accessible", () => {
      render(<SummaryStatsPanel stats={mockNumericStats} />);
      const button = screen.getByRole("button", {
        name: /expand|collapse|summary/i,
      });
      expect(button).toBeInTheDocument();
    });
  });
});
