import { render, screen, fireEvent } from "@testing-library/react";
import { FilterSelector } from "@/components/dashboard/filter-selector";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("ContentSelector", () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/dashboard");

    const mockSearchParams = new URLSearchParams("contentType=droplets");
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => mockSearchParams.get(key),
      toString: () => mockSearchParams.toString(),
      [Symbol.iterator]: () => mockSearchParams[Symbol.iterator](),
    });
  });

  it("navigates to the correct URL when a tab is clicked", () => {
    render(
      <FilterSelector
        droplets={1}
        playlists={1}
        archived={1}
        groups={1}
        favorited={0}
      />,
    );

    fireEvent.click(screen.getByText(/playlists/i));

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/dashboard?contentType=playlists",
    );
  });
});
