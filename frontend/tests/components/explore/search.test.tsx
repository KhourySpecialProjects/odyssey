import { render, screen } from "@testing-library/react";
import { Search } from "@/components/explore/search";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("updates search query when typing", async () => {
    render(
      <SearchProvider>
        <Search />
      </SearchProvider>,
    );

    const input = screen.getByPlaceholderText("Search...");
    await userEvent.type(input, "test query");

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("q=test+query"),
    );
  });
});
