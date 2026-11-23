import { readFileSync } from "fs";
import path from "path";
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

const svgWith = (inner: string, rootAttrs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"${rootAttrs}>${inner}<rect width="4" height="4"/></svg>`;

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
    expect(decodedSrc(container)).toContain("<polygon");
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

  it.each([
    ["script", svgWith("<script>alert(1)</script>"), /<script|alert/],
    ["onload", svgWith("", ' onload="alert(1)"'), /onload|alert/],
    [
      "foreignObject",
      svgWith("<foreignObject><div>hi</div></foreignObject>"),
      /foreignObject|<div/i,
    ],
    [
      "outside href",
      svgWith(
        '<use href="https://evil.test/a.svg#x"/><image href="https://evil.test/i.png"/>',
      ),
      /evil\.test|<use|<image/,
    ],
    [
      "xlink:href",
      svgWith('<use xlink:href="https://evil.test/a.svg#x"/>'),
      /evil\.test|xlink:href/,
    ],
    [
      "javascript: url",
      svgWith('<a href="javascript:alert(1)"><circle r="2"/></a>'),
      /javascript:/i,
    ],
    [
      "style import",
      svgWith("<style>@import url(https://evil.test/x.css);</style>"),
      /evil\.test|@import/,
    ],
  ])("strips %s from the emblem", (_name, svg, banned) => {
    const { container } = render(
      <DropletBadge title="T" emblemSvg={svg} size="md" />,
    );
    const out = decodedSrc(container);
    expect(out).toContain("<rect");
    expect(out).not.toMatch(banned);
  });

  it("never uses dangerouslySetInnerHTML", () => {
    const dir = path.join(__dirname, "../../../components/badges");
    for (const file of ["droplet-badge.tsx", "badge-ribbon.tsx"]) {
      expect(readFileSync(path.join(dir, file), "utf8")).not.toContain(
        "dangerouslySetInnerHTML",
      );
    }
  });
});
