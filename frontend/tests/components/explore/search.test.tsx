import { render, screen } from "@testing-library/react";
import { Search } from "@/components/explore/search";
import { useRouter } from "next/navigation";
import userEvent from "@testing-library/user-event";
import { SearchProvider } from "@/contexts/SearchContext";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: () => "/explore",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Search", () => {
  const mockRouter = {
    push: jest.fn(),
  };
  let replaceStateSpy: jest.SpyInstance;

  beforeEach(() => {
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
});
