import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/header/logo";

describe("Logo", () => {
  it("renders both logo variants on the first render", () => {
    render(<Logo width={100} height={100} />);

    // Next.js Image component transforms the src, so we check the URL parameter instead
    const [lightLogo, darkLogo] = screen.getAllByAltText("Khoury Odyssey Logo");
    expect(lightLogo).toHaveAttribute(
      "src",
      expect.stringContaining("/_next/image?url=%2Flogo.png&w=256&q=75"),
    );
    expect(darkLogo).toHaveAttribute(
      "src",
      expect.stringContaining("url=%2Flogo_dark.png"),
    );
  });

  it("shows the light logo only outside dark mode", () => {
    render(<Logo width={100} height={100} />);

    const [lightLogo] = screen.getAllByAltText("Khoury Odyssey Logo");
    expect(lightLogo).toHaveClass("dark:hidden");
  });

  it("shows the dark logo only in dark mode", () => {
    render(<Logo width={100} height={100} />);

    const [, darkLogo] = screen.getAllByAltText("Khoury Odyssey Logo");
    expect(darkLogo).toHaveClass("hidden", "dark:block");
  });

  it("passes width and height through to both images", () => {
    render(<Logo width={165} height={45} />);

    screen.getAllByAltText("Khoury Odyssey Logo").forEach((img) => {
      expect(img).toHaveAttribute("width", "165");
      expect(img).toHaveAttribute("height", "45");
    });
  });
});
