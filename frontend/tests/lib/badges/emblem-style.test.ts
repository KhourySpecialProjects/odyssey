import { EMBLEM_PALETTE, EMBLEM_STYLE_GUIDE } from "@/lib/badges/emblem-style";

describe("EMBLEM_STYLE_GUIDE", () => {
  it.each([
    ['viewBox="0 0 220 100"'],
    ["12 KB"],
    ["No text"],
    ["different key idea"],
    ["xmlns"],
    ["<foreignObject>"],
  ])("mentions %s", (phrase) => {
    expect(EMBLEM_STYLE_GUIDE).toContain(phrase);
  });

  it("suggests every palette colour without requiring them", () => {
    for (const hex of Object.values(EMBLEM_PALETTE)) {
      expect(EMBLEM_STYLE_GUIDE).toContain(hex);
    }
    expect(EMBLEM_STYLE_GUIDE).toContain("not required");
  });
});
