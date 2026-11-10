import { fireEvent, render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { ResetFiltersButton } from "@/components/explore/reset-filters-button";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ push }),
  useSearchParams: jest.fn(),
}));

const setSearchQuery = jest.fn();
let mockSearchQuery = "";
jest.mock("@/contexts/SearchContext", () => ({
  useSearch: () => ({ searchQuery: mockSearchQuery, setSearchQuery }),
}));

const renderButton = (query: string, search = "") => {
  mockSearchQuery = search;
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(query));
  return render(<ResetFiltersButton />);
};

describe("ResetFiltersButton (ODY-256)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is shown when a filter is active", () => {
    renderButton("focusArea=personal");
    expect(
      screen.getByRole("button", { name: "Reset filters" }),
    ).toBeInTheDocument();
  });

  it("is shown when only a search is active", () => {
    renderButton("", "zzz");
    expect(
      screen.getByRole("button", { name: "Reset filters" }),
    ).toBeInTheDocument();
  });

  it("is not shown when nothing is filtered", () => {
    renderButton("sort=name%3Aasc&page=2");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clears filters, search and page but keeps sort", () => {
    renderButton(
      "sort=name%3Aasc&type=video&focusArea=personal&difficulty=easy&tags=a&q=zzz&page=3",
      "zzz",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(setSearchQuery).toHaveBeenCalledWith("");
    expect(push).toHaveBeenCalledWith("/explore?sort=name%3Aasc");
  });

  it("pushes the bare path when nothing else is left", () => {
    renderButton("tags=a");
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(push).toHaveBeenCalledWith("/explore");
  });
});
