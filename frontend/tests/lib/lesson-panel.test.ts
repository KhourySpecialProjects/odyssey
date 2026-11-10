import { LESSON_PANEL } from "@/lib/lesson-panel";

const num = (re: RegExp, s: string) => Number(s.match(re)?.[1]);

describe("LESSON_PANEL", () => {
  const panelWidth = num(/w-\[(\d+)px\]/, LESSON_PANEL.width);

  it("puts the toggle column fully beside the open panel", () => {
    expect(num(/right-\[(\d+)px\]/, LESSON_PANEL.toggleRight)).toBeGreaterThan(
      panelWidth,
    );
  });

  it("stacks the wide-screen sheet above the site footer (z-50)", () => {
    expect(num(/sm:z-\[(\d+)\]/, LESSON_PANEL.sheet)).toBeGreaterThan(50);
  });

  it("keeps Mentor full-screen above everything below sm", () => {
    expect(LESSON_PANEL.sheet).toContain("z-[60]");
  });
});
