import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { ExploreSearchProvider } from "@/components/explore/explore-search-provider";
import { useSearch } from "@/contexts/SearchContext";

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

function ShowQuery() {
  return <output>{useSearch().searchQuery}</output>;
}

describe("ExploreSearchProvider (ODY-865)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Read on the client: the server-rendered page that Back restores was made
  // before the query was typed
  it.each<[string, URLSearchParams | null, string]>([
    ["?q=python", new URLSearchParams("q=python&page=2"), "python"],
    ["no ?q=", new URLSearchParams("page=2"), ""],
    ["a missing router context", null, ""],
  ])("starts the search from %s", (_label, params, query) => {
    (useSearchParams as jest.Mock).mockReturnValue(params);
    render(
      <ExploreSearchProvider>
        <ShowQuery />
      </ExploreSearchProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(query);
  });
});
