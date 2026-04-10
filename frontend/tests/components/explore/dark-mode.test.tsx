import { render, screen, fireEvent } from "@testing-library/react";
import { DarkMode } from "@/components/explore/dark-mode";
import { useTheme } from "next-themes";
import userEvent from "@testing-library/user-event";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

describe("DarkMode", () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
    });
  });

  it("toggles theme when clicked", () => {
    render(<DarkMode />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("shows correct icon based on theme", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
    });
    render(<DarkMode />);
    expect(screen.getByRole("button")).toHaveClass(
      "relative h-7 w-12 rounded-full bg-white/20 transition-colors",
    );
  });

  jest.mock("next-themes", () => ({
    useTheme: jest.fn(),
  }));

  describe("DarkMode", () => {
    it("toggles theme when clicked", async () => {
      const mockSetTheme = jest.fn();
      (useTheme as jest.Mock).mockReturnValue({
        theme: "dark",
        setTheme: mockSetTheme,
      });

      render(<DarkMode />);
    });
  });
});
