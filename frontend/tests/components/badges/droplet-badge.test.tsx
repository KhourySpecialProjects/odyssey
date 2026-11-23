import { render, screen } from "@testing-library/react";
import { DropletBadge } from "@/components/badges/droplet-badge";
import { SAMPLE_BADGE_EMBLEMS } from "@/testing/mocks/badges";

const TITLE = "AI for Work: Problem Solving with GenAI Tools";
const DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";

const decodedSrc = (container: HTMLElement) => {
  const src = container.querySelector("img")!.getAttribute("src")!;
  expect(src.startsWith(DATA_PREFIX)).toBe(true);
  return decodeURIComponent(src.slice(DATA_PREFIX.length));
};

describe("DropletBadge", () => {
  it("is announced as '<title> badge' with a decorative emblem and one title", () => {
    const { container } = render(
      <DropletBadge
        title={TITLE}
        emblemSvg={SAMPLE_BADGE_EMBLEMS[0]}
        size="md"
      />,
    );
    expect(
      screen.getByRole("img", { name: `${TITLE} badge` }),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByText(TITLE).closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryAllByText(TITLE)).toHaveLength(1);
  });

  it("clamps the title to two lines and keeps the full title in a title attribute", () => {
    render(<DropletBadge title={TITLE} size="sm" />);
    expect(screen.getByText(TITLE)).toHaveClass("line-clamp-2");
    expect(screen.getByText(TITLE).parentElement).toHaveAttribute(
      "title",
      TITLE,
    );
  });

  it.each(["sm", "md", "lg"] as const)("renders size %s", (size) => {
    render(<DropletBadge title="T" size={size} className="extra" />);
    const badge = screen.getByRole("img", { name: "T badge" });
    expect(badge).toHaveAttribute("data-size", size);
    expect(badge).toHaveClass("extra");
  });

  it("renders a safe emblem as an svg data URL image", () => {
    const { container } = render(
      <DropletBadge title="T" emblemSvg={SAMPLE_BADGE_EMBLEMS[1]} size="md" />,
    );
    expect(decodedSrc(container)).toContain('viewBox="0 0 220 100"');
    expect(screen.queryByTestId("badge-placeholder")).not.toBeInTheDocument();
  });

  it.each([
    ["no emblem", undefined],
    ["an empty emblem", "  "],
    ["an emblem that sanitizes to nothing", "<script>alert(1)</script>"],
    ["markup that is not an svg", "<div>hi</div>"],
  ])("shows the placeholder for %s", (_label, emblemSvg) => {
    const { container } = render(
      <DropletBadge title="T" emblemSvg={emblemSvg} size="md" />,
    );
    expect(screen.getByTestId("badge-placeholder")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps the emblem's markup out of the DOM and the frame svg hidden", () => {
    const { container } = render(
      <DropletBadge title="T" emblemSvg={SAMPLE_BADGE_EMBLEMS[1]} size="md" />,
    );
    // Only the <img> src carries the emblem; the frame is our own svg.
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelectorAll("svg *:not([data-part])")).toHaveLength(
      0,
    );
    const frames = container.querySelectorAll("svg");
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("puts every emblem in the same box, so its shape cannot change the badge", () => {
    const { container } = render(
      <DropletBadge
        title="T"
        emblemSvg={
          '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="90"/></svg>'
        }
        size="md"
      />,
    );
    const box = screen.getByTestId("badge-emblem-box");
    expect(box).toContainElement(container.querySelector("img"));
    expect(container.querySelector("img")).toHaveClass(
      "h-full",
      "w-full",
      "object-contain",
    );
    expect(screen.getByRole("img", { name: "T badge" })).toHaveClass(
      "aspect-[712/882]",
    );
  });

  it("draws a rosette: 24-point seal, light ring, black face and a ribbon behind them", () => {
    const { container } = render(<DropletBadge title="T" size="md" />);
    const part = (name: string) =>
      container.querySelector(`[data-part="${name}"]`)!;
    expect(part("seal").getAttribute("points")!.split(" ")).toHaveLength(48);
    expect(part("ring")).toHaveAttribute("r", "310");
    expect(part("face")).toHaveAttribute("fill", "#000");
    // The ribbon is drawn first, so the seal covers its top.
    expect(
      part("ribbon").compareDocumentPosition(part("seal")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
