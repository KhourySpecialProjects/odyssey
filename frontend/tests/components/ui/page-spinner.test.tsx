import { render, screen } from "@testing-library/react";
import PageSpinner from "@/components/ui/page-spinner";
import DropletLoading from "@/app/(droplets)/d/loading";
import NewDropletLoading from "@/app/(creation)/new/droplet/loading";
import DraftLessonLoading from "@/app/(editing)/draft/d/[slug]/[lessonSlug]/loading";

// Route loaders render inside layouts (e.g. /activity's column between the
// sidebar and friends panel). Viewport units (h-screen/w-screen) size the
// wrapper to the whole window, so the spinner lands off-centre and clipped.
describe.each([
  ["PageSpinner", PageSpinner],
  ["/d loading", DropletLoading],
  ["/new/droplet loading", NewDropletLoading],
  ["draft lesson loading", DraftLessonLoading],
])("%s", (_name, Loader) => {
  it("centres in its container instead of the viewport", () => {
    render(<Loader />);
    const wrapper = screen.getByRole("status").closest("div")!;
    expect(wrapper.className).not.toMatch(/\b[hw]-screen\b/);
    expect(wrapper).toHaveClass("w-full", "items-center", "justify-center");
  });
});
