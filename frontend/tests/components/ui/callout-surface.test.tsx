import { render, screen } from "@testing-library/react";
import { CalloutSurface } from "@/components/ui/callout-surface";
import {
  CALLOUT_CONTAINER_CLASS,
  CALLOUT_STYLES,
  CALLOUT_TYPES,
} from "@/lib/blocknote/callout-styles";

const renderSurface = (props: Partial<Parameters<typeof CalloutSurface>[0]>) =>
  render(
    <CalloutSurface type="warning" iconEnabled {...props}>
      <p>
        <strong>bold</strong> <code>code</code> <a href="/x">link</a>
      </p>
    </CalloutSurface>,
  );

describe("CalloutSurface matches the creator's callout block", () => {
  it.each(CALLOUT_TYPES)(
    "%s uses the editor's colour, icon and layout",
    (type) => {
      const { container } = renderSurface({ type });
      const root = container.firstElementChild as HTMLElement;
      const svg = container.querySelector("svg");

      expect(root.style.backgroundColor).not.toBe("");
      const probe = document.createElement("div");
      probe.style.backgroundColor = CALLOUT_STYLES[type].bg;
      expect(root.style.backgroundColor).toBe(probe.style.backgroundColor);
      CALLOUT_CONTAINER_CLASS.split(" ").forEach((c) =>
        expect(root).toHaveClass(c),
      );
      expect(svg).toHaveClass("lucide");
      expect(svg).toHaveAttribute("width", "24");
      const Icon = CALLOUT_STYLES[type].icon;
      expect(svg?.innerHTML).toBe(
        render(<Icon size={24} strokeWidth={2} />).container.querySelector(
          "svg",
        )?.innerHTML,
      );
    },
  );

  it("falls back to the stored colour class for classic callouts", () => {
    const { container } = renderSurface({ type: "info", color: "bg-red-300" });
    expect(container.firstElementChild).toHaveClass("bg-red-300", "border");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
