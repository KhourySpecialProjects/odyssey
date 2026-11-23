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

  it("never uses dangerouslySetInnerHTML", () => {
    const dir = path.join(__dirname, "../../../components/badges");
    for (const file of ["droplet-badge.tsx", "badge-ribbon.tsx"]) {
      expect(readFileSync(path.join(dir, file), "utf8")).not.toContain(
        "dangerouslySetInnerHTML",
      );
    }
  });
});
