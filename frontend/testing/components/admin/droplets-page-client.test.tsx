import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Droplet } from "@/types";
import { DropletsPageClient } from "@/components/admin/droplets/droplets-page-client";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@/lib/requests/droplet", () => ({ updateDroplet: jest.fn() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

function makeDroplet(i: number, overrides: Partial<Droplet> = {}): Droplet {
  return {
    id: i,
    slug: `droplet-${i}`,
    name: `Droplet ${String(i).padStart(2, "0")}`,
    type: "knowledge",
    focusArea: "technical",
    learningObjectives: [],
    isHidden: false,
    status: "published",
    createdAt: `2025-01-${String(i).padStart(2, "0")}T00:00:00.000Z`,
    updatedAt: `2025-02-${String(30 - i).padStart(2, "0")}T00:00:00.000Z`,
    ...overrides,
  } as Droplet;
}

const DROPLETS = [
  makeDroplet(1, { name: "Alpha", status: "draft" }),
  makeDroplet(2, { name: "Bravo", status: "edit" }),
  makeDroplet(3, { name: "Charlie", status: "published" }),
  makeDroplet(4, { name: "Delta", status: "draft" }),
];

const user = userEvent.setup();

// Desktop table rows only render titles as links; mobile cards share the DOM.
function titles() {
  return screen
    .getAllByRole("link", { name: /^(Alpha|Bravo|Charlie|Delta|Droplet \d+)$/ })
    .map((a) => a.textContent)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

async function openFilter() {
  await user.click(screen.getByRole("button", { name: /^filter$/i }));
}

async function applyFilter() {
  await user.click(screen.getByRole("button", { name: /^apply$/i }));
}

describe("DropletsPageClient status filter", () => {
  it("shows a checkbox for each droplet status", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await openFilter();
    for (const label of ["Draft", "Edit", "Published"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });

  it("filters by one status", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await openFilter();
    await user.click(screen.getByRole("checkbox", { name: "Draft" }));
    await applyFilter();
    expect(titles()).toEqual(["Alpha", "Delta"]);
  });

  it("filters by several statuses", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await openFilter();
    await user.click(screen.getByRole("checkbox", { name: "Draft" }));
    await user.click(screen.getByRole("checkbox", { name: "Edit" }));
    await applyFilter();
    expect(titles()).toEqual(["Alpha", "Bravo", "Delta"]);
  });

  it("combines with the type filter", async () => {
    const droplets = [
      makeDroplet(1, { name: "Alpha", status: "draft", type: "skill" }),
      makeDroplet(2, { name: "Bravo", status: "draft", type: "knowledge" }),
    ];
    render(<DropletsPageClient droplets={droplets} />);
    await openFilter();
    await user.click(screen.getByRole("checkbox", { name: "Draft" }));
    await user.click(screen.getByRole("checkbox", { name: "Skill" }));
    await applyFilter();
    expect(titles()).toEqual(["Alpha"]);
  });

  it("restores all droplets on reset", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await openFilter();
    await user.click(screen.getByRole("checkbox", { name: "Published" }));
    await applyFilter();
    expect(titles()).toEqual(["Charlie"]);
    await openFilter();
    await user.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it("resets to page 1 when a filter is applied", async () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      makeDroplet(i + 1, { status: i < 10 ? "draft" : "published" }),
    );
    render(<DropletsPageClient droplets={many} />);
    await user.click(
      screen.getAllByRole("button", { name: /go to next page/i })[0],
    );
    expect(titles()[0]).toBe("Droplet 09");
    await openFilter();
    await user.click(screen.getByRole("checkbox", { name: "Draft" }));
    await applyFilter();
    expect(titles()[0]).toBe("Droplet 01");
  });
});

describe("DropletsPageClient date sort", () => {
  async function sortBy(label: string) {
    await user.click(screen.getByRole("button", { name: /sort by/i }));
    await user.click(screen.getByRole("radio", { name: label }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /apply/i,
      }),
    );
  }

  it("sorts by newest created first", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await sortBy("Created: newest");
    expect(titles()).toEqual(["Delta", "Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by oldest created first", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await sortBy("Created: oldest");
    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it("sorts by most recently updated first", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await sortBy("Updated: newest");
    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it("sorts by least recently updated first", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await sortBy("Updated: oldest");
    expect(titles()).toEqual(["Delta", "Charlie", "Bravo", "Alpha"]);
  });

  it("sorts titles Z-A", async () => {
    render(<DropletsPageClient droplets={DROPLETS} />);
    await sortBy("Z–A");
    expect(titles()).toEqual(["Delta", "Charlie", "Bravo", "Alpha"]);
  });
});
