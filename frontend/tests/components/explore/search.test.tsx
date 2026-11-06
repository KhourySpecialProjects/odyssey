import { render, screen } from "@testing-library/react";
import { Search } from "@/components/explore/search";
import { useRouter } from "next/navigation";
import userEvent from "@testing-library/user-event";
import { SearchProvider } from "@/contexts/SearchContext";

let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: () => "/explore",
  useSearchParams: () => mockSearchParams,
}));

describe("Search", () => {
  const mockRouter = {
    push: jest.fn(),
  };
  let replaceStateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    replaceStateSpy = jest.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it("mirrors the query into the URL without a server navigation", async () => {
    render(
      <SearchProvider>
        <Search />
      </SearchProvider>,
    );

    const input = screen.getByPlaceholderText("Search...");
    await userEvent.type(input, "test query");

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("q=test+query"),
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("does not touch the URL on mount when there is no query", async () => {
    render(
      <SearchProvider>
        <Search />
      </SearchProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("goes back to page 1 as soon as the search changes (ODY-865)", async () => {
    mockSearchParams = new URLSearchParams("sort=name%3Aasc&page=3");
    render(
      <SearchProvider>
        <Search />
      </SearchProvider>,
    );

    await userEvent.type(screen.getByPlaceholderText("Search..."), "p");

    // Straight away, not after the 300 ms debounce
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?sort=name%3Aasc",
    );
  });

  it("keeps a search and page from the URL when Explore opens again (ODY-865)", async () => {
    mockSearchParams = new URLSearchParams("q=py&page=2");
    render(
      <SearchProvider initialQuery="py">
        <Search />
      </SearchProvider>,
    );

    expect(screen.getByPlaceholderText("Search...")).toHaveValue("py");
    await new Promise((resolve) => setTimeout(resolve, 350));
    // Before ODY-865 the mount effect deleted q from the URL
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
