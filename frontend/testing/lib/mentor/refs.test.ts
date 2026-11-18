import { citedRefs, LINK_PATTERN, REF_PATTERN } from "@/lib/mentor/refs";

describe("LINK_PATTERN", () => {
  it.each([
    ["a linked phrase", "A [base case][p2] stops it.", [["base case", "p2"]]],
    ["a link to several refs", "[two][p2, p3]", [["two", "p2, p3"]]],
    ["refs side by side", "See [p3][p5] and [p3, p4][p5].", []],
    ["a ref, then a link", "See [p3][words][p5].", [["words", "p5"]]],
  ])("%s", (_, answer, links) => {
    const found = [...answer.matchAll(new RegExp(LINK_PATTERN))];
    expect(found.map((m) => [m[1], m[2]])).toEqual(links);
  });
});

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
