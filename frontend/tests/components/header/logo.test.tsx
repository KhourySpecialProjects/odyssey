import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/header/logo";
import { useTheme } from "next-themes";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

describe("Logo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dark logo when theme is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      mounted: true,
    });

    render(<Logo width={100} height={100} />);
    const logoImage = screen.getByAltText("Khoury Odyssey Logo");
    // Next.js Image component transforms the src, so we check the URL parameter instead
    expect(logoImage).toHaveAttribute(
      "src",
      expect.stringContaining("url=%2Flogo_dark.png"),
    );
  });

  it("renders light logo when theme is light", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      resolvedTheme: "light",
      mounted: true,
    });

    render(<Logo width={100} height={100} />);
    const logoImage = screen.getByAltText("Khoury Odyssey Logo");
    expect(logoImage).toHaveAttribute(
      "src",
      expect.stringMatching("/logo.svg"),
    );
  });

  it("renders dark logo when resolvedTheme is dark but theme is light", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      resolvedTheme: "dark",
      mounted: true,
    });

    render(<Logo width={100} height={100} />);
    const logoImage = screen.getByAltText("Khoury Odyssey Logo");
    expect(logoImage).toHaveAttribute(
      "src",
      expect.stringContaining("url=%2Flogo_dark.png"),
    );
  });
});
