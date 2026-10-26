import { render, screen } from "@testing-library/react";
import { FrozenOverview } from "@/components/draft/metadata/frozen-overview";
import type { Droplet } from "@/types";

const droplet = {
  name: "Python Basics",
  description: "<p>A short description</p>",
  overview: "<p>The <strong>overview</strong></p><script>alert(1)</script>",
  focusArea: "technical",
  type: "skill",
  difficulty: "beginner",
  tags: [{ id: 2, name: "python", slug: "python" }],
  learningObjectives: [{ id: 1, objective: "Write a loop" }],
  nextSteps: [
    { id: 3, label: "Read the docs", url: "https://docs.python.org" },
  ],
  prerequisites: [{ id: 8, name: "Intro to Code", slug: "intro" }],
  postrequisites: [{ id: 9, name: "Advanced Python", slug: "advanced" }],
  funFact: "Python is named after Monty Python.",
  datasets: [
    {
      id: 4,
      name: "iris.csv",
      format: "csv",
      fileUrl: "https://cdn/iris.csv",
      fileSize: 10,
    },
  ],
} as unknown as Droplet;

describe("FrozenOverview", () => {
  it("renders every field as plain content", () => {
    render(<FrozenOverview droplet={droplet} authorNames={["Ada Lovelace"]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Python Basics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A short description")).toBeInTheDocument();
    expect(screen.getByText("overview")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Skill")).toBeInTheDocument();
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Write a loop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the docs" })).toHaveAttribute(
      "href",
      "https://docs.python.org",
    );
    expect(screen.getByText("Intro to Code")).toBeInTheDocument();
    expect(screen.getByText("Advanced Python")).toBeInTheDocument();
    expect(
      screen.getByText("Python is named after Monty Python."),
    ).toBeInTheDocument();
    expect(screen.getByText("iris.csv")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("has no buttons or textboxes", () => {
    render(<FrozenOverview droplet={droplet} authorNames={["Ada Lovelace"]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("sanitizes the overview HTML", () => {
    const { container } = render(
      <FrozenOverview droplet={droplet} authorNames={[]} />,
    );

    expect(container.querySelector("script")).toBeNull();
  });

  it("shows placeholders for empty sections", () => {
    render(
      <FrozenOverview
        droplet={
          {
            name: "Bare",
            focusArea: "personal",
            type: "knowledge",
            learningObjectives: [],
          } as unknown as Droplet
        }
        authorNames={[]}
      />,
    );

    expect(screen.getByText("No authors listed.")).toBeInTheDocument();
    expect(screen.getAllByText("None yet.").length).toBeGreaterThan(0);
  });
});
