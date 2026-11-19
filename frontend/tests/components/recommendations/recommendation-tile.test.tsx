import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendationTile } from "@/components/recommendations/recommendation-tile";
import { recommendation } from "@/testing/mocks/recommendations";

const pick = recommendation(
  {
    id: 4,
    name: "Intro to SQL",
    slug: "intro-to-sql",
    type: "skill",
    description: "<p>Query &amp; join tables.</p>",
    tags: [{ id: 1, name: "Databases", slug: "databases" }],
    lessons: [{ id: 1 }, { id: 2 }],
  },
  { reason: "Builds on Databases 101", rule: "postrequisite" },
);

describe("RecommendationTile", () => {
  it("shows why it was picked, the droplet, its badges and lesson count, and links to it", () => {
    render(<RecommendationTile recommendation={pick} />);

    expect(screen.getByText("Builds on Databases 101")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Intro to SQL" })).toHaveAttribute(
      "href",
      "/d/intro-to-sql",
    );
    expect(screen.getByText("Query & join tables.")).toBeInTheDocument();
    for (const badge of ["Technical", "Skill", "Databases"]) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
    expect(screen.getByText("2 lessons")).toBeInTheDocument();
  });

  it("leaves the lesson count off the strip's card, and the ✕ off without onDismiss", () => {
    render(<RecommendationTile recommendation={pick} variant="card" />);

    expect(screen.getByText("Builds on Databases 101")).toBeInTheDocument();
    expect(screen.queryByText("2 lessons")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("dismisses by numeric droplet id from a ✕ named after the droplet", async () => {
    const onDismiss = jest.fn();
    render(<RecommendationTile recommendation={pick} onDismiss={onDismiss} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Not interested in Intro to SQL" }),
    );
    expect(onDismiss).toHaveBeenCalledWith(4);
  });
});
