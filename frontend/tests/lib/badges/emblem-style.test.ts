import { EMBLEM_STYLE_GUIDE } from "@/lib/badges/emblem-style";

describe("EMBLEM_STYLE_GUIDE", () => {
  it.each([
    ['viewBox="0 0 100 100"'],
    ["12 KB"],
    ["No text"],
    ["different key idea"],
    ["line icon"],
    ["#FFFFFF"],
    ["xmlns"],
    ["<foreignObject>"],
  ])("mentions %s", (phrase) => {
    expect(EMBLEM_STYLE_GUIDE).toContain(phrase);
  });
});
