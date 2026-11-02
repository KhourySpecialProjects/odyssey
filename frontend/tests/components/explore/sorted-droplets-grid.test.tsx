import { fireEvent, render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { SortedDropletsGrid } from "@/components/explore/sorted-droplets-grid";
import type { Droplet } from "@/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useSearchParams: jest.fn(),
}));

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: Droplet }) => <li>{droplet.name}</li>,
}));

let mockSearchQuery = "";
jest.mock("@/contexts/SearchContext", () => ({
  useSearch: () => ({ searchQuery: mockSearchQuery }),
}));

// 20 droplets, 9 per page: pages of 1–9, 10–18 and 19–20
const names = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `Droplet ${from + i}`);
const droplets = names(1, 20).map(
  (name, i) =>
    ({
      id: i + 1,
      name,
      completionPercentage: 0,
      authorized_users: [],
    }) as unknown as Droplet & { completionPercentage: number },
);

const renderGrid = (query: string) => {
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(query));
  return render(
    <SortedDropletsGrid
      droplets={droplets}
      completedLessonIds={[]}
      enrolledDropletIds={[]}
      ratingsMap={new Map()}
      dueDates={[]}
    />,
  );
};

const shownNames = () =>
  screen.getAllByRole("listitem").map((li) => li.textContent);

describe("SortedDropletsGrid paging (ODY-865)", () => {
  let pushStateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchQuery = "";
    pushStateSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
  });

  it.each<[string, string, string[]]>([
    ["no page", "", names(1, 9)],
    ["page 2, which survives mounting", "page=2", names(10, 18)],
    ["a page past the end, as the last page", "page=99", names(19, 20)],
    ["a bad page, as page 1", "page=abc", names(1, 9)],
  ])("shows %s", (_label, query, expected) => {
    renderGrid(query);
    expect(shownNames()).toEqual(expected);
    // Mounting must never move the page (the old reset-to-1 effect did)
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("writes the chosen page into the URL", () => {
    renderGrid("q=drop");
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?q=drop&page=3",
    );
  });

  it.each<[string, string, string[]]>([
    // Matches 1 and 10–19: 11 results, so page 2 holds the last 2
    ["2 pages of results", "Droplet 1", ["Droplet 18", "Droplet 19"]],
    // Matches 2 and 20: one page, so page 2 becomes page 1
    ["1 page of results", "Droplet 2", ["Droplet 2", "Droplet 20"]],
  ])("pages the search results: page 2 of %s", (_label, query, expected) => {
    mockSearchQuery = query;
    renderGrid("page=2");
    expect(shownNames()).toEqual(expected);
  });
});
