import { render, screen } from "@testing-library/react";
import { Filter } from "@/components/explore/filter";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("Filter", () => {
  const mockOptions = [
    { label: "Option 1", value: "opt1", count: 2 },
    { label: "Option 2", value: "opt2", count: 3 },
  ];

  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue("/test");
  });

  it("renders filter button with label", () => {
    render(<Filter name="test" label="Test Filter" options={mockOptions} />);
    expect(screen.getByText("Test Filter")).toBeInTheDocument();
  });

  describe("Filter", () => {
    const mockOptions = [
      { label: "Option 1", value: "opt1", count: 5 },
      { label: "Option 2", value: "opt2", count: 3 },
    ];

    it("displays selected values correctly", async () => {
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set("test", "opt1,opt2");
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      render(<Filter name="test" label="Test Filter" options={mockOptions} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("handles filter selection and deselection", async () => {
      const mockRouter = { push: jest.fn() };
      (useRouter as jest.Mock).mockReturnValue(mockRouter);

      render(<Filter name="test" label="Test Filter" options={mockOptions} />);

      await userEvent.click(screen.getByRole("button"));

      await userEvent.click(screen.getByText("Option 1"));
      expect(mockRouter.push).toHaveBeenCalledWith("/test?test=opt1");

      await userEvent.click(screen.getByText("Option 2"));
      expect(mockRouter.push).toHaveBeenCalledWith("/test?test=opt1");
    });
  });
});
