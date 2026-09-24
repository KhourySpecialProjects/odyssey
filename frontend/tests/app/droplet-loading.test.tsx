import { render, screen } from "@testing-library/react";
import Loading from "@/app/(droplets)/d/[slug]/loading";

describe("droplet page loading skeleton", () => {
  it("is announced as a loading status", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading lesson");
  });

  it("uses the lesson page's own container spacing so content doesn't shift", () => {
    render(<Loading />);
    // Matches DropletLessonWrapper's `px-40 pt-6` column, not a centred prose box
    expect(screen.getByRole("status")).toHaveClass("w-full", "px-40", "pt-6");
    expect(screen.getByRole("status")).not.toHaveClass("mx-auto");
  });
});
