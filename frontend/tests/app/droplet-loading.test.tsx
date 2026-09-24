import { render, screen } from "@testing-library/react";
import Loading from "@/app/(droplets)/d/[slug]/loading";

describe("droplet page loading skeleton", () => {
  it("is announced as a loading status", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading lesson");
  });

  it("uses the lesson page's own responsive container spacing so content doesn't shift", () => {
    render(<Loading />);
    // Matches DropletLessonWrapper: phone/tablet padding, 160px from lg up
    expect(screen.getByRole("status")).toHaveClass(
      "w-full",
      "px-4",
      "sm:px-8",
      "lg:px-40",
      "pt-6",
    );
    expect(screen.getByRole("status")).not.toHaveClass("px-40", "mx-auto");
  });
});
