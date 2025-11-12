import { render, screen } from "@testing-library/react";
import { FilterSelector } from "@/components/dashboard/filter-selector";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("ContentSelector", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue("/test");
  });

  it("renders all tabs", () => {
    render(
      <FilterSelector
        droplets={1}
        playlists={1}
        archived={1}
        groups={1}
        favorited={0}
      />,
    );
    expect(screen.getByText(/droplets/i)).toBeInTheDocument();
    expect(screen.getByText(/playlists/i)).toBeInTheDocument();
    expect(screen.getByText(/archived/i)).toBeInTheDocument();
    expect(screen.getByText(/groups/i)).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=playlists"),
    );
    render(
      <FilterSelector
        droplets={1}
        playlists={1}
        archived={1}
        groups={1}
        favorited={0}
      />,
    );
    expect(screen.getByText(/playlists/i).parentElement).toHaveClass(
      "flex flex-wrap gap-2",
    );
  });
});
