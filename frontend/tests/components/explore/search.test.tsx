import { render, screen, fireEvent } from "@testing-library/react";
import { Search } from "@/components/explore/search";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import userEvent from "@testing-library/user-event";

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

  it("updates search query on submit", () => {
    render(<Search />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test query" } });

    const form = screen.getByRole("searchbox").closest("form");
    fireEvent.submit(form!);

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("q=test+query"),
    );
  });

  describe("Search", () => {
    it("updates query string on form submission and button click", async () => {
      const { push } = jest.requireMock("next/navigation").useRouter();
      render(<Search />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "test query");
      await userEvent.type(searchInput, "{enter}");
      expect(push).toHaveBeenCalledWith("/explore?q=test+query");

      const searchButton = screen.getByRole("button");
      await userEvent.click(searchButton);
      expect(push).toHaveBeenCalledWith("/explore?q=test+query");
    });
  });
});
