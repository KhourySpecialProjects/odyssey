import { render, screen } from "@testing-library/react";
import Loading from "@/app/(droplets)/d/[slug]/loading";
import RecapLoading from "@/app/(droplets)/d/[slug]/recap/loading";

describe("droplet page loading skeleton", () => {
  it("is announced as a loading status", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading lesson");
  });

  it("uses the lesson page's own container spacing so content doesn't shift", () => {
    render(<Loading />);
    // DropletLessonWrapper's px-40 pt-6 plus LessonRenderer's pt-6
    expect(screen.getByRole("status")).toHaveClass("w-full", "px-40", "pt-12");
    expect(screen.getByRole("status")).not.toHaveClass("mx-auto");
  });

  it("uses the recap page's responsive padding on the recap", () => {
    render(<RecapLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveClass("px-4", "pt-6", "sm:px-8", "lg:px-40");
    expect(status).not.toHaveClass("px-40", "pt-12");
  });
});
