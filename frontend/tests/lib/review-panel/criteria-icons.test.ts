import { IconMessageCircle, IconTarget } from "@tabler/icons-react";
import { criterionIcon } from "@/lib/review-panel/criteria-icons";

describe("criterionIcon", () => {
  it("maps known criteria, ignoring case and spacing", () => {
    expect(criterionIcon("Tone")).toBe(IconMessageCircle);
    expect(criterionIcon("  tone ")).toBe(criterionIcon("Tone"));
  });

  it("gives every seeded criterion its own icon", () => {
    const names = ["Tone", "Style", "Flow", "Scaffolding", "Quality"];
    const icons = new Set(names.map(criterionIcon));
    expect(icons.size).toBe(names.length);
    expect(icons.has(IconTarget)).toBe(false);
  });

  it("falls back for an unknown name", () => {
    expect(criterionIcon("Something new")).toBe(IconTarget);
  });
});
