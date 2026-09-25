import { render, screen, fireEvent } from "@testing-library/react";
import { Sort } from "@/components/explore/sort";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("Sort", () => {
  const mockOptions = [
    {
      label: "Name A-Z",
      slug: "name:asc",
      sortKey: "name:asc" as
        | "name:asc"
        | "name:desc"
        | "createdAt:asc"
        | "createdAt:desc"
        | "completion:asc"
        | "completion:desc"
        | "rating:asc"
        | "rating:desc",
    },
    {
      label: "Name Z-A",
      slug: "name:desc",
      sortKey: "name:asc" as
        | "name:asc"
        | "name:desc"
        | "createdAt:asc"
        | "createdAt:desc"
        | "completion:asc"
        | "completion:desc"
        | "rating:asc"
        | "rating:desc",
    },
  ];
  const defaultValue = mockOptions[0];

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue("/test");
  });

  it("renders sort button with default option", () => {
    render(<Sort options={mockOptions} defaultValue={defaultValue} />);
    expect(screen.getByText("Name A-Z")).toBeInTheDocument();
  });

  it("shows options when clicked", () => {
    render(<Sort options={mockOptions} defaultValue={defaultValue} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Name A-Z")).toBeInTheDocument();
  });

  const mockDefaultValue = {
    label: "Latest",
    slug: "latest",
    sortKey: "name:asc" as
      | "name:asc"
      | "name:desc"
      | "createdAt:asc"
      | "createdAt:desc"
      | "completion:asc"
      | "completion:desc"
      | "rating:asc"
      | "rating:desc",
  };

  it("updates query string correctly when selecting sort options", async () => {
    const mockRouter = { push: jest.fn() };
    const mockPathname = "/explore";
    const mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    render(<Sort options={mockOptions} defaultValue={mockDefaultValue} />);

    await userEvent.click(screen.getByRole("button"));

    const pushStateSpy = jest.spyOn(window.history, "pushState");
    await userEvent.click(screen.getByText("Name Z-A"));

    // Sorting is client-side: the URL updates without a server navigation.
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?sort=name%3Adesc",
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
    pushStateSpy.mockRestore();
  });

  it("keeps the sort param when the default option is chosen", async () => {
    (usePathname as jest.Mock).mockReturnValue("/explore");
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("sort=name%3Adesc"),
    );
    const pushStateSpy = jest.spyOn(window.history, "pushState");

    render(<Sort options={mockOptions} defaultValue={defaultValue} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("Name A-Z"));

    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?sort=name%3Aasc",
    );
    pushStateSpy.mockRestore();
  });
});
