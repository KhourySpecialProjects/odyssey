import { EMBLEM_PALETTE, EMBLEM_STYLE_GUIDE } from "@/lib/badges/emblem-style";

describe("EMBLEM_STYLE_GUIDE", () => {
  it.each([
    ['viewBox="0 0 220 100"'],
    ["50 KB"],
    ["No text"],
    ["xmlns"],
    ["<foreignObject>"],
  ])("mentions %s", (phrase) => {
    expect(EMBLEM_STYLE_GUIDE).toContain(phrase);
  });

  it("lists every palette colour", () => {
    for (const hex of Object.values(EMBLEM_PALETTE)) {
      expect(EMBLEM_STYLE_GUIDE).toContain(hex);
    }
  });
});
