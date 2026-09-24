import { render, screen } from "@testing-library/react";
import { DropletFiltersButton } from "@/components/feed/droplet-filters-button";
import { defaultSort, sorting } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/activity",
  useSearchParams: () => new URLSearchParams(),
}));

describe("DropletFiltersButton", () => {
  it("can't be opened while it's a loading placeholder", () => {
    render(
      <DropletFiltersButton
        sortOptions={sorting}
        defaultSort={defaultSort}
        tagOptions={[]}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: /Filters/ })).toBeDisabled();
  });

  it("is enabled once tag options are loaded", () => {
    render(
      <DropletFiltersButton
        sortOptions={sorting}
        defaultSort={defaultSort}
        tagOptions={[]}
      />,
    );
    expect(screen.getByRole("button", { name: /Filters/ })).toBeEnabled();
  });
});
