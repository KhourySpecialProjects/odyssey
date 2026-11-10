import { citedRefs, REF_PATTERN } from "@/lib/mentor/refs";

describe("citedRefs", () => {
  it.each([
    ["one ref", "Joins combine tables [p3].", ["p3"]],
    ["refs side by side", "See [p3][p5].", ["p3", "p5"]],
    ["a list of refs", "See [p3, p5,p7].", ["p3", "p5", "p7"]],
    [
      "first-cited order, each once",
      "[p5] then [p3] and [p5, p3]",
      ["p5", "p3"],
    ],
    ["none without brackets", "As p3 says", []],
    ["none for other brackets", "Use arr[0] or [P3] or [p]", []],
  ])("%s", (_, answer, refs) => {
    expect(citedRefs(answer)).toEqual(refs);
  });

  it("finds every ref wherever the shared pattern was left", () => {
    REF_PATTERN.test("See [p1]");
    expect(REF_PATTERN.lastIndex).toBeGreaterThan(0);
    expect(citedRefs("[p1] and [p2]")).toEqual(["p1", "p2"]);
    REF_PATTERN.lastIndex = 0;
  });
});
